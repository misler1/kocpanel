"use client";

// src/app/kazanim-havuzu/ImportPanel.tsx
// Gerekli paket: npm install xlsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

type ParsedRow = {
  line: number;
  category: string;
  subject: string;
  name: string;
  unit: string | null;
  code: string | null;
  kind: "konu" | "kazanim";
};

const norm = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();

// Başlık eşleştirme (Türkçe karakter ve boşluk farklarına toleranslı)
const HEADERS: Record<string, string[]> = {
  category: ["sınav türü", "sinav turu", "sınav", "sinav"],
  subject: ["ders"],
  name: ["kazanım / konu", "kazanım/konu", "kazanım", "kazanim", "konu", "kazanım / konu"],
  unit: ["ünite", "unite", "başlık", "baslik"],
  code: ["kod", "kazanım kodu"],
  kind: ["tür", "tur", "tip"],
};

export default function ImportPanel({ onDone }: { onDone: () => void }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function onFile(file: File) {
    setResult("");
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets["Kazanımlar"] ?? wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const parsed: ParsedRow[] = [];
    const errs: string[] = [];

    raw.forEach((r, i) => {
      const line = i + 2; // 1. satır başlık
      const get = (key: keyof typeof HEADERS) => {
        for (const h of Object.keys(r)) {
          if (HEADERS[key].includes(norm(h))) return String(r[h] ?? "").trim();
        }
        return "";
      };
      const category = get("category");
      const subject = get("subject");
      const name = get("name");
      if (!category && !subject && !name) return; // boş satır
      if (!category || !subject || !name) {
        errs.push(`Satır ${line}: Sınav Türü, Ders ve Kazanım/Konu doldurulmalı.`);
        return;
      }
      const k = norm(get("kind"));
      parsed.push({
        line,
        category,
        subject,
        name,
        unit: get("unit") || null,
        code: get("code") || null,
        kind: k.startsWith("kazan") ? "kazanim" : "konu",
      });
    });

    if (raw.length && !parsed.length && !errs.length) errs.push("Dosyada okunabilir satır bulunamadı.");
    setRows(parsed);
    setProblems(errs);
  }

  async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>) {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await build(from, from + 999);
      if (!data?.length) break;
      out.push(...data);
      if (data.length < 1000) break;
    }
    return out;
  }

  async function runImport() {
    setBusy(true);
    setResult("");
    try {
      // 1) Sınav türleri
      const { data: cats } = await supabase.from("exam_categories").select("id, code, name, sort_order");
      const catList = cats ?? [];
      const catId = new Map<string, string>(); // norm(name|code) -> id
      catList.forEach((c) => {
        catId.set(norm(c.name), c.id);
        catId.set(norm(c.code), c.id);
      });
      let created = { cat: 0, sub: 0, topic: 0 };
      for (const name of [...new Set(rows.map((r) => r.category))]) {
        if (catId.has(norm(name))) continue;
        const code = name.toUpperCase().replace(/[^A-Z0-9ÇĞİÖŞÜ]+/g, "_").slice(0, 20);
        const { data, error } = await supabase
          .from("exam_categories")
          .insert({ code, name, sort_order: catList.length + created.cat + 1 })
          .select("id")
          .single();
        if (error || !data) throw new Error(`Sınav türü oluşturulamadı (${name}): ${error?.message}`);
        catId.set(norm(name), data.id);
        created.cat++;
      }

      // 2) Dersler
      const catIds = [...new Set(rows.map((r) => catId.get(norm(r.category))!))];
      const subs = await fetchAll<{ id: string; category_id: string; name: string }>((f, t) =>
        supabase.from("curriculum_subjects").select("id, category_id, name").in("category_id", catIds).range(f, t)
      );
      const subId = new Map<string, string>(); // catId|norm(subject) -> id
      subs.forEach((s) => subId.set(`${s.category_id}|${norm(s.name)}`, s.id));
      const orderCount = new Map<string, number>();
      subs.forEach((s) => orderCount.set(s.category_id, (orderCount.get(s.category_id) ?? 0) + 1));

      for (const r of rows) {
        const cid = catId.get(norm(r.category))!;
        const key = `${cid}|${norm(r.subject)}`;
        if (subId.has(key)) continue;
        const n = (orderCount.get(cid) ?? 0) + 1;
        const { data, error } = await supabase
          .from("curriculum_subjects")
          .insert({ category_id: cid, name: r.subject, sort_order: n })
          .select("id")
          .single();
        if (error || !data) throw new Error(`Ders oluşturulamadı (${r.subject}): ${error?.message}`);
        subId.set(key, data.id);
        orderCount.set(cid, n);
        created.sub++;
      }

      // 3) Mevcut konular (tekrar eklememek için)
      const allSubIds = [...new Set(rows.map((r) => subId.get(`${catId.get(norm(r.category))}|${norm(r.subject)}`)!))];
      const existing = await fetchAll<{ subject_id: string; name: string }>((f, t) =>
        supabase.from("curriculum_topics").select("subject_id, name").in("subject_id", allSubIds).range(f, t)
      );
      const seen = new Set(existing.map((e) => `${e.subject_id}|${norm(e.name)}`));
      const counter = new Map<string, number>();
      existing.forEach((e) => counter.set(e.subject_id, (counter.get(e.subject_id) ?? 0) + 1));

      // 4) Konuları ekle
      const toInsert: {
        subject_id: string;
        kind: "konu" | "kazanim";
        code: string | null;
        name: string;
        unit: string | null;
        sort_order: number;
      }[] = [];
      let skipped = 0;
      for (const r of rows) {
        const sid = subId.get(`${catId.get(norm(r.category))}|${norm(r.subject)}`)!;
        const k = `${sid}|${norm(r.name)}`;
        if (seen.has(k)) {
          skipped++;
          continue;
        }
        seen.add(k);
        const n = (counter.get(sid) ?? 0) + 1;
        counter.set(sid, n);
        toInsert.push({ subject_id: sid, kind: r.kind, code: r.code, name: r.name, unit: r.unit, sort_order: n });
      }
      for (let i = 0; i < toInsert.length; i += 500) {
        const { error } = await supabase.from("curriculum_topics").insert(toInsert.slice(i, i + 500));
        if (error) throw new Error("Kayıtlar eklenemedi: " + error.message);
        created.topic += Math.min(500, toInsert.length - i);
      }

      setResult(
        `Tamamlandı: ${created.topic} kayıt eklendi` +
          (skipped ? `, ${skipped} tekrar eden kayıt atlandı` : "") +
          (created.sub ? `, ${created.sub} yeni ders` : "") +
          (created.cat ? `, ${created.cat} yeni sınav türü` : "") +
          "."
      );
      setRows([]);
      setFileName("");
      onDone();
    } catch (e) {
      setResult("Hata: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  // Önizleme özeti: sınav türü > ders > adet
  const summary = rows.reduce<Record<string, number>>((a, r) => {
    const k = `${r.category} › ${r.subject}`;
    a[k] = (a[k] ?? 0) + 1;
    return a;
  }, {});

  const box: React.CSSProperties = {
    border: "1px solid var(--border, #e2e2e2)",
    borderRadius: 8,
    padding: 12,
    background: "var(--card, #fff)",
    marginBottom: 16,
  };
  const btn: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    background: "var(--primary, #2b4acb)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  };

  return (
    <div style={box}>
      <h2 style={{ fontSize: 15, marginBottom: 6 }}>Excel / CSV ile yükle</h2>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 10 }}>
        Şablondaki sütunlar: Sınav Türü, Ders, Kazanım / Konu (zorunlu); Ünite, Kod, Tür (isteğe bağlı).
        Aynı kayıt tekrar yüklenirse atlanır.
      </p>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {fileName && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <strong>{fileName}</strong>: {rows.length} geçerli satır
          {problems.length > 0 && `, ${problems.length} hatalı satır`}
          {Object.keys(summary).length > 0 && (
            <ul style={{ margin: "6px 0 0 18px" }}>
              {Object.entries(summary).map(([k, v]) => (
                <li key={k}>{k}: {v}</li>
              ))}
            </ul>
          )}
          {problems.length > 0 && (
            <ul style={{ margin: "6px 0 0 18px", color: "#b42318" }}>
              {problems.slice(0, 8).map((p) => <li key={p}>{p}</li>)}
              {problems.length > 8 && <li>… ve {problems.length - 8} satır daha</li>}
            </ul>
          )}
          {rows.length > 0 && (
            <button style={{ ...btn, marginTop: 10, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={runImport}>
              {busy ? "Yükleniyor..." : `${rows.length} satırı içe aktar`}
            </button>
          )}
        </div>
      )}

      {result && <p role="status" style={{ marginTop: 10, fontSize: 13 }}>{result}</p>}
    </div>
  );
}
