import type { PdfTemplate, ExtractedPdfRecord, ExamQuestion, ExamRankings } from './types';
import { tokenize, clusterRows, type FillRect, type PdfItem, type Row, type Tok } from './items';
import { trDateToIso, trUpper, toResults, type DY } from './shared';

// ───────────────────────── Şablon: "DENEME SINAVI SONUÇ BELGESİ" (TYT) ─────────────────────────
// Dosya: sıralama listesi (Sıra · Ad Soyad · Sınıf · TUR · SOS · MAT · FEN · Toplam · D·Y·B · Puan · Okul …)
// ve her öğrenci için 2 sayfalık karne. Karnede:
//   - ADI SOYADI · SINIF · OKUL NO · OKUL · KİTAPÇIK · SINAV TARİHİ
//   - TYT PUANI · TOPLAM NET · DOĞRU·YANLIŞ·BOŞ, SIRALAMA tablosu (KAPSAM · SIRA · KATILIM · DİLİM)
//   - DERS SONUÇLARI yalnızca 4 test düzeyinde: Türkçe, Sosyal Bilimler, Matematik, Fen Bilimleri
//   - CEVAP ÇİZELGESİ: her soru için bir kutu. Doğru/yanlış/boş bilgisi YALNIZCA kutu rengindedir
//     (yeşil doğru · kırmızı yanlış · gri boş); kutudaki harf doğru cevaptır.
// Sosyal ve Fen testleri, uygulamadaki ders anahtarlarına (tarih, coğrafya, … fizik, kimya, biyoloji)
// TYT'nin standart soru sırasıyla ve kutu renklerinden bölünür. Renkler okunamazsa ya da sayılar
// ders tablosuyla tutmazsa kayıt yanlış veriyle oluşturulmaz, o karne atlanır.

type Mark = 'D' | 'Y' | 'B';

/** Teşhis: son okumada karnelerin neden atlandığı (hata mesajında gösterilir) */
export const dsDiag = { reason: '' };
const fail = (why: string): null => {
  if (!dsDiag.reason.includes(why)) dsDiag.reason = dsDiag.reason ? `${dsDiag.reason}; ${why}` : why;
  return null;
};

const TESTS: { re: RegExp; id: 'TUR' | 'SOS' | 'MAT' | 'FEN' }[] = [
  { re: /^T[ÜU]RK[ÇC]E$/, id: 'TUR' },
  { re: /^SOSYAL( B[İI]L[İI]MLER)?$/, id: 'SOS' },
  { re: /^MATEMAT[İI]K$/, id: 'MAT' },
  { re: /^FEN( B[İI]L[İI]MLER[İI])?$/, id: 'FEN' },
];
const testOf = (label: string) => TESTS.find((t) => t.re.test(trUpper(label).replace(/\s+/g, ' ').trim()))?.id ?? null;

/** Test içindeki soru aralıkları → ders anahtarı (TYT standart sırası). Seçmeli felsefe din kültürü yerine sayılır. */
function sectionsFor(id: 'TUR' | 'SOS' | 'MAT' | 'FEN', soru: number): { from: number; to: number; key: string; k: string }[] | null {
  if (id === 'TUR') return [{ from: 1, to: soru, key: 'turkce', k: 'Türkçe' }];
  if (id === 'MAT') return [{ from: 1, to: soru, key: 'matematik', k: 'Matematik' }];
  if (id === 'SOS' && (soru === 20 || soru === 25)) {
    const s = [
      { from: 1, to: 5, key: 'tarih', k: 'Tarih' },
      { from: 6, to: 10, key: 'cografya', k: 'Coğrafya' },
      { from: 11, to: 15, key: 'felsefe', k: 'Felsefe' },
      { from: 16, to: 20, key: 'din', k: 'Din Kültürü' },
    ];
    if (soru === 25) s.push({ from: 21, to: 25, key: 'din', k: 'Felsefe (Seçmeli)' });
    return s;
  }
  if (id === 'FEN' && soru === 20)
    return [
      { from: 1, to: 7, key: 'fizik', k: 'Fizik' },
      { from: 8, to: 14, key: 'kimya', k: 'Kimya' },
      { from: 15, to: 20, key: 'biyoloji', k: 'Biyoloji' },
    ];
  return null;
}

/** Hücre rengi → doğru / yanlış / boş */
function markOf([r, g, b]: [number, number, number]): Mark | null {
  if (g - r >= 8 && g - b >= 2) return 'D'; // yeşil
  if (r - g >= 10 && r - b >= 5) return 'Y'; // kırmızı
  if (Math.max(r, g, b) - Math.min(r, g, b) <= 12) return 'B'; // gri
  return null;
}

const num = (s: string): number | null => {
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+,\d+$/.test(s)) return parseFloat(s.replace(',', '.'));
  return null;
};

const RANK_KEYS: [RegExp, string][] = [
  [/^OKUL$|^KURUM$/, 'kurum'],
  [/^S[İI]N[İI]F$/, 'sinif'],
  [/^[ŞS]UBE$/, 'sube'],
  [/^[İI]L[ÇC]E$/, 'ilce'],
  [/^[İI]L$/, 'il'],
  [/^GENEL$|^T[ÜU]RK[İI]YE$/, 'genel'],
];

function parseKarne(rows: Row[], rects: FillRect[]): ExtractedPdfRecord | null {
  const txt = (r: Row) => r.toks.map((t) => t.s).join(' ');
  const find = (re: RegExp, from = 0) => rows.findIndex((r, i) => i >= from && re.test(txt(r)));

  // Ad soyad / sınav tarihi: başlık satırının altındaki satır
  const hi = find(/^ADI SOYADI\b/);
  if (hi < 0 || !rows[hi + 1]) return fail('ADI SOYADI yok');
  const hdr = rows[hi].toks;
  const colX = (re: RegExp) => hdr.find((t) => re.test(t.s))?.x;
  const sinifX = colX(/^SINIF$/) ?? 250;
  const val = rows[hi + 1].toks;
  const rawName = val.filter((t) => t.x < sinifX - 3).map((t) => t.s).join(' ').trim();
  if (!rawName) return fail('ad boş');
  const examDate = trDateToIso(val.map((t) => t.s).find((s) => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)));

  // Sınav adı: "DENEME SINAVI SONUÇ BELGESİ" ile ADI SOYADI arasındaki "<ad> · <tarih>" satırı
  let examName: string | null = null;
  for (let i = 0; i < hi; i++) {
    const left = rows[i].toks.filter((t) => t.x < 500);
    const s = left.map((t) => t.s).join(' ');
    const m = s.match(/^(.+?)\s+·\s+\d{1,2}\s+\p{L}+\s+\d{4}$/u);
    if (m && !/BELGES[İI]/.test(s)) { examName = m[1].trim(); break; }
  }

  // TYT puanı: "TYT PUANI" başlığının altında, solda
  let puan: number | undefined;
  const pi = find(/^TYT PUANI\b/);
  if (pi >= 0) {
    for (let i = pi + 1; i < Math.min(rows.length, pi + 5) && puan === undefined; i++) {
      const t = rows[i].toks.find((x) => x.x < 150 && /^\d{1,3},\d{1,3}$/.test(x.s));
      if (t) puan = num(t.s) ?? undefined;
    }
  }

  // Sıralama tablosu (sağ sütun): KAPSAM · SIRA · KATILIM · DİLİM
  const rankings: ExamRankings = {};
  const ki = rows.findIndex((r) => r.toks.some((t) => t.s === 'KAPSAM'));
  if (ki >= 0) {
    const kx = (rows[ki].toks.find((t) => t.s === 'KAPSAM') as Tok).x;
    const kat: Record<string, number> = {};
    for (let i = ki + 1; i < rows.length; i++) {
      const right = rows[i].toks.filter((t) => t.x >= kx - 5);
      if (!right.length) continue;
      if (/^\d+$/.test(right[0].s) && right[1] && !/^\d+$/.test(right[1].s) && /^[A-ZÇĞİÖŞÜ]/.test(right[1].s)) break; // sonraki bölüm başlığı ("5 NET GELİŞİMİ")
      const key = RANK_KEYS.find(([re]) => re.test(trUpper(right[0].s)))?.[1];
      const nums = right.slice(1).map((t) => num(t.s));
      if (!key || nums[0] == null || !Number.isInteger(nums[0])) continue;
      rankings[key] = nums[0];
      if (nums[1] != null && Number.isInteger(nums[1])) kat[key] = nums[1];
    }
    if (Object.keys(kat).length) rankings.katilimci = kat;
  }

  // DERS SONUÇLARI: test · SORU · D · Y · B · NET · ÖNCEKİ · FARK · SINIF ORT. · GENEL ORT.
  const di = find(/^DERS SORU D Y B NET\b/);
  const ci = find(/\bCEVAP Ç[İI]ZELGES[İI]/);
  if (di < 0 || ci < 0) return fail(`ders tablosu/çizelge yok (${di},${ci})`);
  const tests: Record<string, { soru: number; d: number; y: number; b: number; ort: number | null }> = {};
  for (let i = di + 1; i < ci; i++) {
    const r = rows[i].toks.filter((t) => t.x < 530);
    const ni = r.findIndex((t) => num(t.s) !== null);
    if (ni <= 0) continue;
    const id = testOf(r.slice(0, ni).map((t) => t.s).join(' '));
    const v = r.slice(ni).map((t) => num(t.s)).filter((x): x is number => x !== null);
    if (!id || v.length < 4) continue;
    const [soru, d, y, b] = v;
    if (d + y + b !== soru) continue;
    tests[id] = { soru, d, y, b, ort: v.length >= 7 ? v[v.length - 1] : null };
  }
  if (!tests.TUR && !tests.MAT) return fail('ders satırları okunamadı');

  // CEVAP ÇİZELGESİ: her test satırında soru başına bir parça (harf ya da "–"), rengi kutudan
  const results: Record<string, DY> = {};
  const questions: ExamQuestion[] = [];
  for (let i = ci + 1; i < rows.length; i++) {
    const r = rows[i];
    const cells = r.toks.filter((t) => /^[A-E–-]$/.test(t.s) && t.x > 80 && t.x < 530);
    const label = r.toks.filter((t) => !cells.includes(t)).map((t) => t.s).join(' ');
    const id = testOf(label);
    if (!id) {
      if (/Ç[İI]ZELGES|^\d+ [A-ZÇĞİÖŞÜ]/.test(txt(r)) && questions.length) break;
      continue;
    }
    const tst = tests[id];
    if (!tst || cells.length !== tst.soru) return fail(`${id}: ${cells.length} kutu / ${tst?.soru} soru`);
    const sections = sectionsFor(id, tst.soru);
    if (!sections) return fail(`${id}: ${tst.soru} soruluk test bölünemiyor`);
    const marks: Mark[] = [];
    for (const c of cells) {
      // parçanın taban çizgisi kutunun içinde, biraz üstünde orta noktası
      const box = rects.findLast((q) => q.x0 - 1 <= c.x + 2 && c.x + 2 <= q.x1 + 1 && q.y0 - 1 <= c.y + 3 && c.y + 3 <= q.y1 + 1 && q.x1 - q.x0 < 20 && q.y1 - q.y0 < 20);
      const m = box ? markOf(box.rgb) : null;
      if (!m) return fail(`${id}: renk okunamadı ${box ? box.rgb.join(',') : 'kutu yok'}`); // renk okunamadı: tahminle kayıt üretme
      marks.push(m);
    }
    const d = marks.filter((m) => m === 'D').length;
    const y = marks.filter((m) => m === 'Y').length;
    if (d !== tst.d || y !== tst.y) return fail(`${id}: renk ${d}D ${y}Y ≠ tablo ${tst.d}D ${tst.y}Y`); // renkler ders tablosuyla tutmuyor
    for (const s of sections) {
      for (let n = s.from; n <= s.to; n++) {
        const m = marks[n - 1];
        const cur = results[s.key] ?? { d: 0, y: 0 };
        results[s.key] = { d: cur.d + (m === 'D' ? 1 : 0), y: cur.y + (m === 'Y' ? 1 : 0) };
        const letter = cells[n - 1].s;
        const dc = /^[A-E]$/.test(letter) ? letter : '?';
        questions.push({ s: s.key, n: n - s.from + 1, k: s.k, dc, oc: m === 'B' ? null : m === 'D' ? dc : '?', r: m });
      }
    }
  }
  // Ders tablosundaki her test çizelgede de bulunmalı
  for (const id of Object.keys(tests)) {
    const keys = sectionsFor(id as 'TUR', tests[id].soru)?.map((s) => s.key) ?? [];
    if (!keys.every((k) => results[k])) return fail(`${id}: çizelgede yok`);
  }

  const averages: Record<string, number> = {};
  const avgKey = { TUR: 'turkce', SOS: 'sosyal', MAT: 'matematik', FEN: 'fen' } as const;
  for (const [id, t] of Object.entries(tests)) if (t.ort !== null) averages[avgKey[id as keyof typeof avgKey]] = t.ort;

  return {
    rawName,
    examName,
    examDate,
    examType: 'TYT',
    results: toResults(results),
    ...(puan !== undefined ? { puan } : {}),
    ...(questions.length ? { questions } : {}),
    ...(Object.keys(averages).length ? { averages } : {}),
    ...(Object.keys(rankings).length ? { rankings } : {}),
  };
}

/** Sıralama listesindeki 3 ondalıklı puanlar (karnede 2 ondalık yazılıyor): ad → puan */
function listPuanlari(items: PdfItem[]): Map<string, number> {
  const out = new Map<string, number>();
  const rows = clusterRows(tokenize(items), 2);
  for (const r of rows) {
    const t = r.toks;
    if (!t[0] || !/^\d+$/.test(t[0].s) || t[0].x > 50) continue;
    const nameEnd = t.findIndex((x, i) => i > 0 && (x.s === '—' || num(x.s) !== null));
    if (nameEnd <= 1) continue;
    const name = t.slice(1, nameEnd).map((x) => x.s).join(' ');
    const p = t.find((x) => /^\d{1,3},\d{3}$/.test(x.s));
    if (p) out.set(trUpper(name), num(p.s) as number);
  }
  return out;
}

export const denemeSonucBelgesiTemplate: PdfTemplate = {
  id: 'deneme-sinavi-sonuc-belgesi',
  label: 'TYT – Deneme Sınavı Sonuç Belgesi (sıralama + karneler)',
  examType: 'TYT',
  canParse: (t) => /DENEME SINAVI SONU[ÇC] BELGES[İI]/.test(t) && /CEVAP\s*Ç[İI]ZELGES[İI]/.test(t) && /TYT/.test(t),
  parse: (_t, _spaced, items, rects) => {
    dsDiag.reason = '';
    if (!rects?.length) dsDiag.reason = 'renkli kutular okunamadı';
    if (!items?.length || !rects?.length) return { examName: null, examDate: null, records: [] };
    const toks = tokenize(items);
    const byPage = new Map<number, Tok[]>();
    for (const t of toks) byPage.set(t.page, [...(byPage.get(t.page) ?? []), t]);
    const rectsByPage = new Map<number, FillRect[]>();
    for (const r of rects) rectsByPage.set(r.page, [...(rectsByPage.get(r.page) ?? []), r]);

    const listPages = items.filter((i) => /^D·Y·B$/.test(i.str.trim())).map((i) => i.page);
    const puanlar = listPuanlari(items.filter((i) => listPages.includes(i.page)));

    const records: ExtractedPdfRecord[] = [];
    for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
      const pr = rectsByPage.get(page);
      if (!pr) continue;
      const rec = parseKarne(clusterRows(byPage.get(page) as Tok[]), pr);
      if (!rec) continue;
      const lp = puanlar.get(trUpper(rec.rawName));
      if (lp !== undefined && (rec.puan === undefined || Math.abs(lp - rec.puan) < 0.011)) rec.puan = lp;
      records.push(rec);
    }
    return { examName: records[0]?.examName ?? null, examDate: records[0]?.examDate ?? null, records };
  },
};
