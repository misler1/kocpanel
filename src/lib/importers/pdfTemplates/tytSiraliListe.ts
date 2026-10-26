import type { PdfTemplate, ExtractedPdfRecord, ExamRankings } from './types';
import { trDateToIso, toResults, type DY } from './shared';

// ───────────────────────── Şablon: TYT sıralı sınıf listesi ─────────────────────────
// Satır (pdf-parse sırası):  SIRA [ŞB] D Y ×(Türkçe,Tar,Coğ,Fel,Din,Mat) TOPLAM(D Y) PUAN ŞB/KRM/İLÇE/İL/GENEL sıralama
//                            D Y ×(Geo,Fiz,Kim,Biy)  NET×10  TOPLAM NET  ADI SOYADI
// Rakamlar bitişik geldiği için tüm boşluklar atılıp kısıt (soru sayısı, net formülü,
// toplam D/Y) ile geri çözülür.
// NOT: Bu listelerde ders netleri 0'a kırpılmaz (örn. "-0,50", "-1,00"); bu yüzden
// net formülü burada kırpmasız, yerel olarak tanımlıdır.

const net4 = (d: number, y: number) => Math.round((d - y / 4) * 100) / 100;
const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

const LISTE_FIRST6 = [
  { key: 'turkce', max: 40 },
  { key: 'tarih', max: 5 },
  { key: 'cografya', max: 5 },
  { key: 'felsefe', max: 5 },
  { key: 'din', max: 5 },
  { key: 'matematik', max: 30 },
];
const LISTE_LAST4 = [
  { key: 'geometri', max: 10 }, // matematik'e eklenir
  { key: 'fizik', max: 7 },
  { key: 'kimya', max: 7 },
  { key: 'biyoloji', max: 6 },
];

function* pairsFor(max: number): Generator<DY> {
  for (let d = 0; d <= max; d++) for (let y = 0; y <= max - d; y++) yield { d, y };
}

function solveFirst6(head: string): { pairs: DY[]; td: number; ty: number }[] {
  const sols: { pairs: DY[]; td: number; ty: number }[] = [];
  const rec = (i: number, pos: number, acc: DY[]) => {
    if (i === 6) {
      const rest = head.slice(pos);
      for (let k = 1; k < rest.length; k++) {
        const a = rest.slice(0, k);
        const b = rest.slice(k);
        if (/^\d+$/.test(a) && /^\d+$/.test(b)) sols.push({ pairs: acc, td: +a, ty: +b });
      }
      return;
    }
    const max = LISTE_FIRST6[i].max;
    for (let d = 0; d <= max; d++) {
      const ds = String(d);
      if (!head.startsWith(ds, pos)) continue;
      for (let y = 0; y <= max - d; y++) {
        const ys = String(y);
        if (!head.startsWith(ys, pos + ds.length)) continue;
        rec(i + 1, pos + ds.length + ys.length, [...acc, { d, y }]);
      }
    }
  };
  rec(0, 0, []);
  return sols;
}

function solveLast4(
  R: string,
  first6: DY[],
  td: number,
  ty: number,
): { pairs: DY[]; rankStr: string } | null {
  const sD = td - first6.reduce((a, p) => a + p.d, 0);
  const sY = ty - first6.reduce((a, p) => a + p.y, 0);
  if (sD < 0 || sY < 0) return null;
  const nets6 = first6.map((p) => fmt(net4(p.d, p.y))).join('');
  const totalNet = fmt(net4(td, ty));
  // R = sıralamalar(≥5 hane) + 8 tamsayı + nets(10) + toplam net
  const tail = (pairs: DY[]) =>
    pairs.map((p) => `${p.d}${p.y}`).join('') +
    nets6 +
    pairs.map((p) => fmt(net4(p.d, p.y))).join('') +
    totalNet;
  const [a, b, c, e] = LISTE_LAST4;
  for (const p1 of pairsFor(a.max))
    for (const p2 of pairsFor(b.max))
      for (const p3 of pairsFor(c.max)) {
        const d4 = sD - p1.d - p2.d - p3.d;
        const y4 = sY - p1.y - p2.y - p3.y;
        if (d4 < 0 || y4 < 0 || d4 + y4 > e.max) continue;
        const pairs = [p1, p2, p3, { d: d4, y: y4 }];
        const tl = tail(pairs);
        if (R.length - tl.length >= 5 && R.endsWith(tl) && /^\d+$/.test(R.slice(0, R.length - tl.length)))
          return { pairs, rankStr: R.slice(0, R.length - tl.length) };
      }
  return null;
}

// "ŞB KRM İLÇE İL GENEL" sıralarını bitişik rakam dizisinden çözer.
// Kurum sırası = satır sırası (SIRA NO) olduğundan sabit nokta olarak kullanılır;
// yalnızca TEK bir geçerli bölünme varsa sonuç döner (belirsizse sıralama eklenmez).
function decodeRanks(s: string, sira: number, lim: { ilce: number; il: number; genel: number }): ExamRankings | null {
  const k = String(sira);
  const ok = (x: string) => /^[1-9]\d*$/.test(x);
  const sols = new Set<string>();
  for (let a = 1; a <= 2; a++) {
    const sb = s.slice(0, a);
    if (!ok(sb) || !s.startsWith(k, a)) continue;
    const r1 = s.slice(a + k.length);
    for (let i = 1; i <= 4; i++)
      for (let j = 1; j <= 5; j++) {
        const ilce = r1.slice(0, i), il = r1.slice(i, i + j), genel = r1.slice(i + j);
        if (!ok(ilce) || !ok(il) || !ok(genel) || genel.length > 6) continue;
        const [vSb, vIlce, vIl, vGenel] = [+sb, +ilce, +il, +genel];
        if (vSb > sira || sira > vIlce || vIlce > vIl || vIl > vGenel) continue;
        if (vIlce > lim.ilce || vIl > lim.il || vGenel > lim.genel) continue;
        sols.add(`${vSb}|${vIlce}|${vIl}|${vGenel}`);
      }
  }
  if (sols.size === 0) return null;
  // Birden çok bölünme mümkünse: ilçe/il/genel sıraları kendi kişi sayılarına oranla birbirine
  // yakın olmalı (aynı öğrencinin yüzdelik dilimi). En tutarlı olanı seç; belirgin fark yoksa ekleme.
  const spread = (c: string) => {
    const [, ilc, il, gn] = c.split('|').map(Number);
    const l = [Math.log(ilc / lim.ilce), Math.log(il / lim.il), Math.log(gn / lim.genel)];
    return Math.max(...l) - Math.min(...l);
  };
  const ranked = [...sols].map((c) => ({ c, sp: spread(c) })).sort((a, b) => a.sp - b.sp);
  if (ranked.length > 1 && ranked[1].sp - ranked[0].sp < 0.5) return null;
  const [sube, ilce, il, genel] = ranked[0].c.split('|').map(Number);
  return { genel, il, ilce, kurum: sira, sube };
}

function parseListeRow(
  line: string,
  expectedSira: number | null,
  lim: { ilce: number; il: number; genel: number },
): { sira: number; rawName: string; puan: number; results: Record<string, DY>; rankings: ExamRankings | null } | null {
  // adı: satırın sonundaki harf bloğu
  const nm = line.match(/^(.*\d)\s*(\p{L}[\p{L} .'’-]*?)\s*$/u);
  if (!nm) return null;
  const body = nm[1].replace(/\s+/g, '');
  const rawName = nm[2].replace(/\s+/g, ' ').trim();

  const siraCands: string[] = [];
  if (expectedSira != null) siraCands.push(String(expectedSira));
  for (let l = 1; l <= 4; l++) {
    const s = body.slice(0, l);
    if (/^\d+$/.test(s) && !siraCands.includes(s)) siraCands.push(s);
  }

  for (const sira of siraCands) {
    if (!body.startsWith(sira)) continue;
    const rest = body.slice(sira.length).replace(/^\p{L}/u, ''); // şube harfi
    const ci = rest.indexOf(',');
    if (ci < 3 || !/^\d{3}$/.test(rest.slice(ci - 3, ci)) || !/^\d{3}$/.test(rest.slice(ci + 1, ci + 4))) continue;
    const puan = parseFloat(rest.slice(ci - 3, ci + 4).replace(',', '.'));
    const head = rest.slice(0, ci - 3);
    const R = rest.slice(ci + 4);
    if (!/^\d+$/.test(head)) continue;

    for (const s6 of solveFirst6(head)) {
      const s4 = solveLast4(R, s6.pairs, s6.td, s6.ty);
      if (!s4) continue;
      const results: Record<string, DY> = {};
      LISTE_FIRST6.forEach((s, i) => (results[s.key] = s6.pairs[i]));
      // geometri matematik'e katılır (net doğrusal olduğu için toplam değişmez)
      results.matematik = { d: results.matematik.d + s4.pairs[0].d, y: results.matematik.y + s4.pairs[0].y };
      LISTE_LAST4.slice(1).forEach((s, i) => (results[s.key] = s4.pairs[i + 1]));
      const siraNo = parseInt(sira, 10);
      return { sira: siraNo, rawName, puan, results, rankings: decodeRanks(s4.rankStr, siraNo, lim) };
    }
  }
  return null;
}

export const tytSiraliListeTemplate: PdfTemplate = {
  id: 'tyt-sirali-liste',
  label: 'TYT – Sıralı sınıf/kurum listesi',
  examType: 'TYT',
  canParse: (t) => /SIRALI/i.test(t) && /L[İI]STES[İI]/i.test(t) && /ADI\s*SOYADI/i.test(t) && /TYT/.test(t),
  parse: (t) => {
    const examDate = trDateToIso(t.match(/Sınav Tarihi\s*:?\s*(\d{1,2}\.\d{1,2}\.\d{4})/)?.[1]);

    // Ad: tarihten sonraki ilk "( KOD )" e kadar  →  "TÜRKİYE GENELİ DENEME-1 (Y2126)"
    const nm =
      t.match(/Sınav Tarihi\s*:?\s*\d{1,2}\.\d{1,2}\.\d{4}\s*([^()\n]*?\(\s*[A-Z0-9]+\s*\))/) ??
      t.match(/([^\n]*TYT[^\n]*?\(\s*[A-Z0-9]+\s*\))/);
    const examName = nm
      ? nm[1].replace(/T[ÜU]RK[İI]YE GENEL[İI]/i, '').replace(/\s+/g, ' ').trim()
      : null;

    // Sıralama üst sınırları (belirsiz bölünmeleri elemek için)
    const num = (re: RegExp, def: number) => {
      const m = t.match(re);
      return m ? parseInt(m[1], 10) : def;
    };
    const lim = {
      genel: num(/S[İI]NAV GENEL[İI]\s*\(\s*(\d+)/i, 999999),
      il: num(/[İI]L GENEL[İI]\s*\(\s*(\d+)/i, 99999),
      ilce: num(/[İI]L[ÇC]E GENEL[İI]\s*\(\s*(\d+)/i, 9999),
    };

    // Her sayfa "SIRA NO ŞB ADI SOYADI ... BİY-1 D. Y. N." başlığıyla başlar; başlıktan sonrası veri,
    // "GENEL ALT ORTALAMALAR" ise özet bölümüdür. (Önceki sürüm yalnızca SON başlıktan sonrasını
    // alıyordu; bu da veri satırlarını atlayıp özet bölümünü okuyordu.)
    let parts = t.split(/SIRA\s*NO\s*[ŞS]B\s*ADI\s*SOYADI/i).slice(1);
    if (parts.length === 0) parts = [t];

    const records: ExtractedPdfRecord[] = [];
    let expected: number | null = null;
    const rowRe = /(\d+\s*\p{Lu}?\s*\d[^\p{L}]*?\d,\d{2})\s*(\p{L}[\p{L} .'’-]*?)(?=\s*\d|\s*$)/gu;

    for (const part of parts) {
      let seg = part;
      const he = seg.match(/B[İI]Y-1\s*D\.\s*Y\.\s*N\./i);
      if (he?.index != null) seg = seg.slice(he.index + he[0].length);
      const cut = seg.search(/GENEL\s+ALT\s+ORTALAMALAR/i);
      if (cut >= 0) seg = seg.slice(0, cut);

      for (const m of seg.matchAll(rowRe)) {
        const r = parseListeRow(`${m[1]} ${m[2]}`.trim(), expected, lim);
        if (!r) continue;
        expected = r.sira + 1;
        const rec: ExtractedPdfRecord = {
          rawName: r.rawName, examName, examDate, puan: r.puan, results: toResults(r.results),
        };
        if (r.rankings) (rec as any).rankings = r.rankings;
        records.push(rec);
      }
    }

    // Katılımcı sayıları (genel + kurum)
    const katGenel = lim.genel < 999999 ? lim.genel : null;
    const katKurum = num(/Kurum Geneli\s*\(\s*(\d+)/i, records.length);
    for (const rec of records) {
      const rk = (rec as any).rankings as ExamRankings | undefined;
      if (rk) rk.katilimci = { ...(katGenel ? { genel: katGenel } : {}), kurum: katKurum };
    }
    return { examName, examDate, records };
  },
};
