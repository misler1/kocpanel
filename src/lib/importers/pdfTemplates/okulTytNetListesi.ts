import type { PdfTemplate, ExtractedPdfRecord, ExamQuestion, ExamRankings } from './types';
import { tokenize, clusterRows, type PdfItem, type Row, type Tok } from './items';
import { trUpper, toResults, type DY } from './shared';

// ───────────────────────── Şablon: "OKUL TYT NET LİSTESİ" + öğrenci karneleri ─────────────────────────
// Dosya iki bölümden oluşur:
//  1) "OKUL TYT NET LİSTESİ (TYT sıralı)": Sıra · Ö.No · İsim · Sınıf · her ders için D Y N · Toplam · Puan · Genel
//  2) Her öğrenci için 2 sayfalık karne:
//     - Üst bilgi: kurum, il/ilçe, sınav adı, "Öğrenci … Sınıf … Öğr.No …"
//     - Puan Türü / Puan / Genel Ortalama / Sıralamalar (Sınıf, Kurum, İlçe, İl, Genel) + Katılımlar
//     - "Ders / Test · Soru · Doğru · Yanlış · Net · Başarı % · Sınıf · Kurum · Genel" tablosu
//     - Cevap tablosu: soru numaraları, öğrenci cevapları (yanlışlar küçük harf), cevap anahtarı
//     - 2. sayfa: kazanım bazında S/D/Y özeti (soru numarası verilmediği için soru eşleştirmesinde kullanılmaz)
// Karne sayfaları varsa (en zengin veri) onlar okunur; yoksa yalnızca liste sayfaları okunur.
// pdf-parse'ın düz metni hücreleri bitiştirdiğinden okuma tamamen konum (x, y) bilgisine dayanır.

type SubjectKey =
  | 'turkce' | 'tarih' | 'cografya' | 'felsefe' | 'din' | 'felsefe_secmeli'
  | 'matematik' | 'geometri' | 'fizik' | 'kimya' | 'biyoloji'
  | 'sosyal' | 'tyt_matematik' | 'fen';

/** Karnedeki ders satırı etiketini ders anahtarına çevirir ("TYT …" alt toplamları önce denenir). */
function labelToKey(label: string): SubjectKey | null {
  const u = trUpper(label).replace(/\s+/g, ' ').trim();
  if (/^TYT SOSYAL/.test(u)) return 'sosyal';
  if (/^TYT MATEMAT[İI]K/.test(u)) return 'tyt_matematik';
  if (/^TYT FEN/.test(u)) return 'fen';
  if (/^(TYT )?T[ÜU]RK[ÇC]E/.test(u)) return 'turkce';
  if (/^TAR[İI]H/.test(u)) return 'tarih';
  if (/^CO[ĞG]RAFYA/.test(u)) return 'cografya';
  if (/^FELSEFE.*SE[ÇC]MEL[İI]/.test(u)) return 'felsefe_secmeli';
  if (/^FELSEFE/.test(u)) return 'felsefe';
  if (/^D[İI]N/.test(u)) return 'din';
  if (/^MATEMAT[İI]K/.test(u)) return 'matematik';
  if (/^GEOMETR[İI]/.test(u)) return 'geometri';
  if (/^F[İI]Z[İI]K/.test(u)) return 'fizik';
  if (/^K[İI]MYA/.test(u)) return 'kimya';
  if (/^B[İI]YOLOJ[İI]/.test(u)) return 'biyoloji';
  return null;
}

const RESULT_KEYS: SubjectKey[] = ['turkce', 'tarih', 'cografya', 'felsefe', 'din', 'matematik', 'geometri', 'fizik', 'kimya', 'biyoloji'];

/** Cevap tablosundaki testlerin soru aralıkları → ders anahtarı */
const GRID_SECTIONS: Record<string, { from: number; to: number; key: string; k: string }[]> = {
  TURKCE: [{ from: 1, to: 40, key: 'turkce', k: 'Türkçe' }],
  SOSYAL: [
    { from: 1, to: 5, key: 'tarih', k: 'Tarih-1' },
    { from: 6, to: 10, key: 'cografya', k: 'Coğrafya-1' },
    { from: 11, to: 15, key: 'felsefe', k: 'Felsefe' },
    { from: 16, to: 20, key: 'din', k: 'Din Kültürü / Felsefe (Seçmeli)' },
  ],
  MATEMATIK: [
    { from: 1, to: 30, key: 'matematik', k: 'Matematik-1' },
    { from: 31, to: 40, key: 'geometri', k: 'Geometri' },
  ],
  FEN: [
    { from: 1, to: 7, key: 'fizik', k: 'Fizik' },
    { from: 8, to: 14, key: 'kimya', k: 'Kimya' },
    { from: 15, to: 20, key: 'biyoloji', k: 'Biyoloji' },
  ],
};

function gridName(s: string): string | null {
  const u = trUpper(s);
  if (/^T[ÜU]RK[ÇC]E$/.test(u)) return 'TURKCE';
  if (/^SOSYAL$/.test(u)) return 'SOSYAL';
  if (/^MATEMAT[İI]K$/.test(u)) return 'MATEMATIK';
  if (/^FEN$/.test(u)) return 'FEN';
  return null;
}

const num = (s: string): number | null => {
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+,\d+$/.test(s)) return parseFloat(s.replace(',', '.'));
  return null;
};

const RANK_LABELS: [RegExp, string][] = [
  [/^S[İI]N[İI]F$/, 'sinif'],
  [/^KURUM$/, 'kurum'],
  [/^[İI]L[ÇC]E$/, 'ilce'],
  [/^[İI]L$/, 'il'],
  [/^GENEL$/, 'genel'],
];

function nearest<T extends { x: number }>(cands: T[], x: number, maxDist: number): T | null {
  let best: T | null = null;
  for (const c of cands) if (!best || Math.abs(c.x - x) < Math.abs(best.x - x)) best = c;
  return best && Math.abs(best.x - x) <= maxDist ? best : null;
}

// ───────────── 1) Öğrenci karnesi (sayfa başına bir öğrenci) ─────────────

function parseKarnePage(rows: Row[]): ExtractedPdfRecord | null {
  const txt = (r: Row) => r.toks.map((t) => t.s).join(' ');
  const oi = rows.findIndex((r) => r.toks[0]?.s === 'Öğrenci' && r.toks.some((t) => t.s === 'Sınıf'));
  const hi = rows.findIndex((r) => /^Ders \/ Test\b/.test(txt(r)));
  if (oi < 0 || hi < 0) return null;

  // Öğrenci adı: "Öğrenci" ile "Sınıf" arası
  const ot = rows[oi].toks;
  const si = ot.findIndex((t) => t.s === 'Sınıf');
  const rawName = ot.slice(1, si).map((t) => t.s).join(' ').trim();
  if (!rawName) return null;
  const examName = oi > 0 ? txt(rows[oi - 1]).trim() || null : null;

  // Puan + sıralamalar
  let puan: number | undefined;
  const rankings: ExamRankings = {};
  const rhi = rows.findIndex((r, i) => i < hi && r.toks.some((t) => t.s === 'Kurum') && r.toks.some((t) => /^[İI]l[çc]e$/.test(t.s)));
  if (rhi >= 0) {
    const cols = rows[rhi].toks
      .map((t) => ({ x: t.x, key: RANK_LABELS.find(([re]) => re.test(trUpper(t.s)))?.[1] }))
      .filter((c): c is { x: number; key: string } => !!c.key);
    const assign = (toks: Tok[]) => {
      const out: Record<string, number> = {};
      for (const t of toks) {
        const v = num(t.s);
        const c = nearest(cols, t.x, 25);
        if (v !== null && Number.isInteger(v) && c && out[c.key] === undefined) out[c.key] = v;
      }
      return out;
    };
    for (let i = rhi + 1; i < hi; i++) {
      const r = rows[i];
      if (r.toks[0]?.s === 'TYT' && puan === undefined) {
        const p = r.toks[1] ? num(r.toks[1].s) : null;
        if (p !== null) puan = p;
        // ilk iki sayı (puan, genel ortalama) sıralama sütunlarının solunda kalır
        const minX = Math.min(...cols.map((c) => c.x)) - 25;
        Object.assign(rankings, assign(r.toks.filter((t) => t.x >= minX)));
      } else if (/^Kat[ıi]l[ıi]mlar$/i.test(r.toks[0]?.s ?? '')) {
        const kat = assign(r.toks.slice(1));
        if (Object.keys(kat).length) rankings.katilimci = kat;
      }
    }
  }

  // Ders tablosu: etiket · Soru · Doğru · Yanlış · Net · Başarı% · Sınıf · Kurum · Genel (ortalamalar)
  const map: Partial<Record<SubjectKey, DY>> = {};
  const averages: Record<string, number> = {};
  let gridStart = rows.length;
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    if (/^\d+$/.test(r.toks[0]?.s ?? '')) { gridStart = i; break; } // cevap tablosunun numara satırı
    const ni = r.toks.findIndex((t) => num(t.s) !== null);
    if (ni <= 0) continue;
    const key = labelToKey(r.toks.slice(0, ni).map((t) => t.s).join(' '));
    const vals = r.toks.slice(ni).map((t) => num(t.s));
    if (!key || vals.length < 4 || vals.some((v) => v === null)) continue;
    const [soru, d, y] = vals as number[];
    if (d + y > soru) continue;
    if (!(key in map)) map[key] = { d, y };
    const genelOrt = vals.length >= 8 ? (vals[7] as number) : null;
    if (genelOrt !== null && key !== 'felsefe_secmeli' && key !== 'tyt_matematik' && averages[key] === undefined) averages[key] = genelOrt;
  }

  // Felsefe (Seçmeli), din kültürü yerine çözülen 5 soruluk alternatif test: din'e eklenir
  const sec = map.felsefe_secmeli;
  if (sec && (sec.d || sec.y)) {
    const din = map.din ?? { d: 0, y: 0 };
    map.din = { d: din.d + sec.d, y: din.y + sec.y };
  }
  const results: Record<string, DY> = {};
  for (const k of RESULT_KEYS) if (map[k]) results[k] = map[k] as DY;
  if (Object.keys(results).length < 3) return null;

  // Cevap tablosu: [numaralar] · "TYT <Test>" öğrenci cevapları · "Cevap Anahtarı" (A kitapçık harfi + cevaplar)
  const questions: ExamQuestion[] = [];
  for (let i = gridStart; i < rows.length; i++) {
    const r = rows[i];
    if (r.toks[0]?.s !== 'TYT' || !r.toks[1]) continue;
    const g = gridName(r.toks[1].s);
    const numRow = rows[i - 1];
    const keyRow = rows[i + 1];
    if (!g || !numRow || !keyRow || !/^Cevap$/.test(keyRow.toks[0]?.s ?? '')) continue;
    const nums = numRow.toks.filter((t) => /^\d{1,2}$/.test(t.s)).map((t) => ({ x: t.x, n: parseInt(t.s, 10) }));
    if (nums.length === 0) continue;
    const firstX = nums[0].x - 6;
    const cellOf = (toks: Tok[]) => {
      const out = new Map<number, string>();
      for (const t of toks) {
        if (t.x < firstX || !/^[A-Ea-e]$/.test(t.s)) continue;
        const c = nearest(nums, t.x, 6);
        if (c && !out.has(c.n)) out.set(c.n, t.s);
      }
      return out;
    };
    const ans = cellOf(r.toks.slice(2));
    const key = cellOf(keyRow.toks.slice(2));
    for (const sec2 of GRID_SECTIONS[g]) {
      for (let n = sec2.from; n <= sec2.to; n++) {
        const dc = key.get(n)?.toUpperCase();
        if (!dc) continue;
        const raw = ans.get(n);
        const oc = raw ? raw.toUpperCase() : null;
        const res: 'D' | 'Y' | 'B' = !oc ? 'B' : oc === dc ? 'D' : 'Y';
        questions.push({ s: sec2.key, n: n - sec2.from + 1, k: sec2.k, dc, oc, r: res });
      }
    }
  }

  return {
    rawName,
    examName,
    examDate: null,
    examType: 'TYT',
    results: toResults(results),
    ...(puan !== undefined ? { puan } : {}),
    ...(questions.length ? { questions } : {}),
    ...(Object.keys(averages).length ? { averages } : {}),
    ...(Object.keys(rankings).length ? { rankings } : {}),
  };
}

// ───────────── 2) Okul net listesi (karneler yoksa) ─────────────

const LIST_GROUPS: (SubjectKey | 'toplam')[] = [
  'turkce', 'tarih', 'cografya', 'felsefe', 'din', 'felsefe_secmeli',
  'matematik', 'geometri', 'fizik', 'kimya', 'biyoloji', 'toplam',
];

function parseListPages(raw: PdfItem[]): { records: ExtractedPdfRecord[]; examName: string | null } {
  const records: ExtractedPdfRecord[] = [];
  let examName: string | null = null;
  const cx = (i: PdfItem) => i.x + i.w / 2;
  const pages = [...new Set(raw.map((i) => i.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const pi = raw.filter((i) => i.page === page && i.str.trim() !== '');
    if (!pi.some((i) => /TYT NET L[İI]STES[İI]/i.test(i.str))) continue;

    // Sınav adı ve katılımcı sayıları: "SINAV ADI" başlığının altındaki satır
    const sinav = pi.find((i) => /^SINAV ADI$/.test(i.str.trim()));
    const katHdr = pi.filter((i) => sinav && Math.abs(i.y - sinav.y) < 2 && i.x > sinav.x + 60);
    const katilimci: Record<string, number> = {};
    if (sinav) {
      const below = pi.filter((i) => i.y < sinav.y - 5 && i.y > sinav.y - 25);
      const nameItems = below.filter((i) => i.x > sinav.x - 150 && i.x < (katHdr[0]?.x ?? Infinity) - 5).sort((a, b) => a.x - b.x);
      if (!examName && nameItems.length) examName = nameItems.map((i) => i.str.trim()).join(' ').replace(/\s+/g, ' ');
      const keys = ['kurum', 'ilce', 'il', 'genel'];
      const hdr = katHdr.sort((a, b) => a.x - b.x).map((h, k) => ({ x: cx(h), key: keys[k] }));
      for (const it of below) {
        const v = num(it.str.trim());
        const c = nearest(hdr, cx(it), 20);
        if (v !== null && c && c.key) katilimci[c.key] = v;
      }
    }

    // Sütun başlıkları: 12 × (D Y N) · Puan · Genel
    const dyn = pi.filter((i) => /^[DYN]$/.test(i.str.trim()));
    const dynY = dyn.length ? dyn[0].y : null;
    if (dynY === null) continue;
    const hdr = dyn.filter((i) => Math.abs(i.y - dynY) < 2).sort((a, b) => a.x - b.x);
    const cols: { x: number; g: number; f: 'D' | 'Y' | 'N' | 'P' | 'G' }[] = [];
    let g = -1;
    for (const h of hdr) {
      const f = h.str.trim() as 'D' | 'Y' | 'N';
      if (f === 'D') g++;
      cols.push({ x: cx(h), g, f });
    }
    if (g + 1 !== LIST_GROUPS.length) continue;
    const puanH = pi.find((i) => /^Puan$/.test(i.str.trim()) && Math.abs(i.y - dynY) < 2);
    const genelH = pi.find((i) => /^Genel$/.test(i.str.trim()) && Math.abs(i.y - dynY) < 2);
    if (puanH) cols.push({ x: cx(puanH), g: -1, f: 'P' });
    if (genelH) cols.push({ x: cx(genelH), g: -1, f: 'G' });
    const sinifH = pi.find((i) => /^S[ıi]n[ıi]f$/.test(i.str.trim()) && i.y > dynY);
    const firstColX = Math.min(...cols.map((c) => c.x)) - 10;

    // Satırlar: x < 40'ta sıra numarası olan satırlar
    const lines = new Map<number, PdfItem[]>();
    for (const it of pi.filter((i) => i.y < dynY - 2)) {
      const key = [...lines.keys()].find((y) => Math.abs(y - it.y) < 2) ?? it.y;
      lines.set(key, [...(lines.get(key) ?? []), it]);
    }
    for (const its of [...lines.values()]) {
      its.sort((a, b) => a.x - b.x);
      const sira = its[0];
      if (!/^\d+$/.test(sira.str.trim()) || sira.x > 40) continue;
      const sinifX = sinifH ? sinifH.x - 3 : 128;
      const nameItems = its.filter((i) => i.x > 55 && i.x < sinifX && !/^\d+$/.test(i.str.trim()));
      const rawName = nameItems.map((i) => i.str.trim()).join(' ').replace(/\s+/g, ' ').trim();
      if (!rawName) continue;

      const dy: Record<string, Partial<DY>> = {};
      let puan: number | undefined;
      let genel: number | undefined;
      for (const it of its) {
        if (it.x + it.w < firstColX) continue;
        const v = num(it.str.trim());
        if (v === null) continue;
        const c = nearest(cols, cx(it), 9);
        if (!c) continue;
        if (c.f === 'P') puan = v;
        else if (c.f === 'G') genel = v;
        else if (c.f === 'D' || c.f === 'Y') {
          const k = LIST_GROUPS[c.g];
          dy[k] = { ...(dy[k] ?? {}), [c.f === 'D' ? 'd' : 'y']: v };
        }
      }
      const get = (k: string): DY | null => (dy[k] && (dy[k].d !== undefined || dy[k].y !== undefined) ? { d: dy[k].d ?? 0, y: dy[k].y ?? 0 } : null);
      const results: Record<string, DY> = {};
      for (const k of RESULT_KEYS) {
        const v = get(k);
        if (v) results[k] = v;
      }
      const sec = get('felsefe_secmeli');
      if (sec && (sec.d || sec.y)) results.din = { d: (results.din?.d ?? 0) + sec.d, y: (results.din?.y ?? 0) + sec.y };
      if (Object.keys(results).length < 3) continue;

      // Puanı hesaplanmayan (netleri çok düşük) öğrenciler sıralamaya girmez
      const rankings: ExamRankings = puan !== undefined ? { kurum: parseInt(sira.str, 10) } : {};
      if (genel !== undefined) rankings.genel = genel;
      if (Object.keys(katilimci).length) rankings.katilimci = { ...katilimci };
      records.push({ rawName, examName, examDate: null, examType: 'TYT', ...(puan !== undefined ? { puan } : {}), results: toResults(results), rankings });
    }
  }
  return { records, examName };
}

export const okulTytNetListesiTemplate: PdfTemplate = {
  id: 'okul-tyt-net-listesi',
  label: 'TYT – Okul net listesi + öğrenci karneleri',
  examType: 'TYT',
  canParse: (t) =>
    /TYT\s*NET\s*L[İI]STES[İI]/i.test(t) ||
    (/Ders\s*\/\s*Test/.test(t) && /Cevap\s*Anahtar[ıi]/.test(t) && /Kat[ıi]l[ıi]mlar/.test(t) && /TYT/.test(t)),
  parse: (_t, _spaced, items) => {
    if (!items?.length) return { examName: null, examDate: null, records: [] };

    // Karne sayfaları
    const toks = tokenize(items);
    const byPage = new Map<number, Tok[]>();
    for (const t of toks) byPage.set(t.page, [...(byPage.get(t.page) ?? []), t]);
    const karne: ExtractedPdfRecord[] = [];
    for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
      const rec = parseKarnePage(clusterRows(byPage.get(page) as Tok[]));
      if (rec) karne.push(rec);
    }
    if (karne.length) return { examName: karne[0].examName ?? null, examDate: null, records: karne };

    // Yalnızca liste sayfaları varsa
    const list = parseListPages(items);
    return { examName: list.examName, examDate: null, records: list.records };
  },
};
