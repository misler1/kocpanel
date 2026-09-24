"use client";

// src/app/kazanim-havuzu/KazanimHavuzuClient.tsx
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ImportPanel from "./ImportPanel";

type Category = { id: string; code: string; name: string };
type Subject = { id: string; name: string; sort_order: number };
type Topic = {
  id: string;
  kind: "konu" | "kazanim";
  code: string | null;
  name: string;
  unit: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function KazanimHavuzuClient({ categories: initial }: { categories: Category[] }) {
  const [supabase] = useState(() => createClient());
  const [categories, setCategories] = useState<Category[]>(initial);
  const [catId, setCatId] = useState<string | null>(initial[0]?.id ?? null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [msg, setMsg] = useState<string>("");

  // form state
  const [newCat, setNewCat] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [kind, setKind] = useState<"konu" | "kazanim">("konu");
  const [unit, setUnit] = useState("");
  const [bulk, setBulk] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 3000);
  };

  const loadSubjects = useCallback(async () => {
    if (!catId) return setSubjects([]);
    const { data } = await supabase
      .from("curriculum_subjects")
      .select("id, name, sort_order")
      .eq("category_id", catId)
      .order("sort_order")
      .order("name");
    setSubjects(data ?? []);
    setSubjectId((cur) => (data?.some((s) => s.id === cur) ? cur : data?.[0]?.id ?? null));
  }, [catId, supabase]);

  const loadTopics = useCallback(async () => {
    if (!subjectId) return setTopics([]);
    const { data } = await supabase
      .from("curriculum_topics")
      .select("id, kind, code, name, unit, sort_order, is_active")
      .eq("subject_id", subjectId)
      .order("sort_order")
      .order("created_at");
    setTopics((data as Topic[]) ?? []);
  }, [subjectId, supabase]);

  useEffect(() => { loadSubjects(); }, [loadSubjects]);
  useEffect(() => { loadTopics(); }, [loadTopics]);

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const code = name.toUpperCase().replace(/[^A-Z0-9ÇĞİÖŞÜ]+/g, "_").slice(0, 20);
    const { data, error } = await supabase
      .from("exam_categories")
      .insert({ code, name, sort_order: categories.length + 1 })
      .select("id, code, name")
      .single();
    if (error) return flash("Sınav türü eklenemedi: " + error.message);
    setCategories([...categories, data]);
    setCatId(data.id);
    setNewCat("");
  }

  async function addSubject() {
    const name = newSubject.trim();
    if (!name || !catId) return;
    const { error } = await supabase
      .from("curriculum_subjects")
      .insert({ category_id: catId, name, sort_order: subjects.length + 1 });
    if (error) return flash("Ders eklenemedi: " + error.message);
    setNewSubject("");
    loadSubjects();
  }

  async function deleteSubject(s: Subject) {
    if (!confirm(`"${s.name}" dersi ve içindeki tüm konular silinecek. Emin misiniz?`)) return;
    const { error } = await supabase.from("curriculum_subjects").delete().eq("id", s.id);
    if (error) return flash("Silinemedi: " + error.message);
    loadSubjects();
  }

  // Her satır bir konu/kazanım. İsteğe bağlı kod için: "M.8.1.1.1 | Kazanım metni"
  async function addBulk() {
    if (!subjectId) return;
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const rows = lines.map((line, i) => {
      const [a, ...rest] = line.split("|");
      const hasCode = rest.length > 0;
      return {
        subject_id: subjectId,
        kind,
        code: hasCode ? a.trim() : null,
        name: hasCode ? rest.join("|").trim() : a.trim(),
        unit: unit.trim() || null,
        sort_order: topics.length + i + 1,
      };
    });
    const { error } = await supabase.from("curriculum_topics").insert(rows);
    if (error) return flash("Eklenemedi: " + error.message);
    setBulk("");
    flash(`${rows.length} kayıt eklendi`);
    loadTopics();
  }

  async function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase.from("curriculum_topics").update({ name }).eq("id", id);
    if (error) return flash("Kaydedilemedi: " + error.message);
    setEditingId(null);
    loadTopics();
  }

  async function toggleActive(t: Topic) {
    await supabase.from("curriculum_topics").update({ is_active: !t.is_active }).eq("id", t.id);
    loadTopics();
  }

  async function deleteTopic(t: Topic) {
    if (!confirm(`"${t.name}" silinsin mi? Öğrenci kayıtlarındaki bağlantı boşa düşer; pasife almak daha güvenlidir.`)) return;
    const { error } = await supabase.from("curriculum_topics").delete().eq("id", t.id);
    if (error) return flash("Silinemedi: " + error.message);
    loadTopics();
  }

     async function reloadAll() {
     const { data } = await supabase
       .from("exam_categories")
       .select("id, code, name")
       .order("sort_order");
     if (data) setCategories(data);
     loadSubjects();
     loadTopics();
   }

  // Ünitelere göre grupla
  const groups = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    const key = t.unit || "Ünitesiz";
    (acc[key] ||= []).push(t);
    return acc;
  }, {});

  const box: React.CSSProperties = {
    border: "1px solid var(--border, #e2e2e2)",
    borderRadius: 8,
    padding: 12,
    background: "var(--card, #fff)",
  };
  const input: React.CSSProperties = {
    padding: "8px 10px",
    border: "1px solid var(--border, #d0d0d0)",
    borderRadius: 6,
    fontSize: 14,
    width: "100%",
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
  const ghost: React.CSSProperties = { ...btn, background: "transparent", color: "inherit", border: "1px solid var(--border, #d0d0d0)" };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Kazanım / Konu Havuzu</h1>
      <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
        Konu ilerleyişi ve deneme girişleri bu listeyi kullanır. Bu sayfayı sadece yönetici görür.
      </p>
           <ImportPanel onDone={reloadAll} />
      {msg && (
        <div role="status" style={{ ...box, marginBottom: 12, background: "#fff8e1" }}>{msg}</div>
      )}

      {/* Sınav türü sekmeleri */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatId(c.id)}
            style={c.id === catId ? btn : ghost}
          >
            {c.name}
          </button>
        ))}
        <input
          style={{ ...input, width: 170 }}
          placeholder="Yeni sınav türü"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <button style={ghost} onClick={addCategory}>Ekle</button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Dersler */}
        <div style={{ ...box, flex: "1 1 220px", maxWidth: 280 }}>
          <h2 style={{ fontSize: 15, marginBottom: 8 }}>Dersler</h2>
          {subjects.length === 0 && <p style={{ fontSize: 13, opacity: 0.6 }}>Bu sınav türünde henüz ders yok.</p>}
          {subjects.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px",
                borderRadius: 6,
                cursor: "pointer",
                background: s.id === subjectId ? "var(--muted, #eef1fb)" : "transparent",
              }}
              onClick={() => setSubjectId(s.id)}
            >
              <span style={{ fontSize: 14 }}>{s.name}</span>
              <button
                aria-label={`${s.name} dersini sil`}
                onClick={(e) => { e.stopPropagation(); deleteSubject(s); }}
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <input
              style={input}
              placeholder="Ders adı"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
            />
            <button style={btn} onClick={addSubject}>Ekle</button>
          </div>
        </div>

        {/* Konular */}
        <div style={{ flex: "3 1 420px", minWidth: 0 }}>
          {!subjectId ? (
            <div style={box}>Önce bir ders ekleyin veya seçin.</div>
          ) : (
            <>
              <div style={{ ...box, marginBottom: 12 }}>
                <h2 style={{ fontSize: 15, marginBottom: 8 }}>Toplu ekle</h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <select style={{ ...input, width: 140 }} value={kind} onChange={(e) => setKind(e.target.value as "konu" | "kazanim")}>
                    <option value="konu">Konu</option>
                    <option value="kazanim">Kazanım</option>
                  </select>
                  <input
                    style={{ ...input, flex: 1, minWidth: 180 }}
                    placeholder="Ünite / başlık (opsiyonel, örn. Üslü İfadeler)"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
                <textarea
                  style={{ ...input, minHeight: 110, fontFamily: "inherit" }}
                  placeholder={"Her satıra bir konu/kazanım yazın.\nKodlu ise: M.8.1.1.1 | Tam sayıların kuvvetini hesaplar"}
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                />
                <button style={{ ...btn, marginTop: 8 }} onClick={addBulk}>Listeye ekle</button>
              </div>

              {topics.length === 0 && <div style={box}>Bu derste henüz kayıt yok. Yukarıdan ekleyebilirsiniz.</div>}

              {Object.entries(groups).map(([g, list]) => (
                <div key={g} style={{ ...box, marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, marginBottom: 6 }}>{g} ({list.length})</h3>
                  {list.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        padding: "5px 0",
                        borderTop: "1px solid var(--border, #eee)",
                        opacity: t.is_active ? 1 : 0.45,
                      }}
                    >
                      {t.code && <span style={{ fontSize: 12, opacity: 0.6, whiteSpace: "nowrap" }}>{t.code}</span>}
                      {editingId === t.id ? (
                        <>
                          <input style={input} value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(t.id)} autoFocus />
                          <button style={btn} onClick={() => saveEdit(t.id)}>Kaydet</button>
                          <button style={ghost} onClick={() => setEditingId(null)}>Vazgeç</button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 14 }}>{t.name}</span>
                          <span style={{ fontSize: 11, opacity: 0.55 }}>{t.kind === "kazanim" ? "kazanım" : "konu"}</span>
                          <button style={ghost} onClick={() => { setEditingId(t.id); setEditName(t.name); }}>Düzenle</button>
                          <button style={ghost} onClick={() => toggleActive(t)}>{t.is_active ? "Pasife al" : "Aktif et"}</button>
                          <button style={ghost} onClick={() => deleteTopic(t)}>Sil</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}