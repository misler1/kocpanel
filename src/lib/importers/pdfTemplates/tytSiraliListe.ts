import type { PdfTemplate, ExtractedPdfRecord } from './types';
import { fmtNet, netYKS, trDateToIso, toResults, type DY } from './shared';

// ───────────────────────── Şablon: TYT sıralı sınıf listesi ─────────────────────────
// Satır (pdf-parse sırası):  SIRA [ŞB] D Y ×(Türkçe,Tar,Coğ,Fel,Din,Mat) TOPLAM(D Y) PUAN ŞB/KRM/İLÇE/İL/GENEL sıralama
//                            D Y ×(Geo,Fiz,Kim,Biy)  NET×10  TOPLAM NET  ADI SOYADI
// Rakamlar bazen boşluksuz bitişik geldiği için tüm boşluklar atılıp kısıt (soru sayısı, net formülü,
// toplam D/Y) ile geri çözülür.

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
): { pairs: DY[] } | null {
  const sD = td - first6.reduce((a, p) => a + p.d, 0);
  const sY = ty - first6.reduce((a, p) => a + p.y, 0);
  if (sD < 0 || sY < 0) return null;
  const nets6 = first6.map((p) => fmtNet(netYKS(p.d, p.y))).join('');
  const totalNet = fmtNet(netYKS(td, ty));
  // R = ranks(≥5 hane) + 8 tamsayı + nets(10) + toplam net
  const tail = (pairs: DY[]) =>
    pairs.map((p) => `${p.d}${p.y}`).join('') +
    nets6 +
    pairs.map((p) => fmtNet(netYKS(p.d, p.y))).join('') +
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
          return { pairs };
      }
  return null;
}

function parseListeRow(
  line: string,
  expectedSira: number | null,
): { sira: number; rawName: string; puan: number; results: Record<string, DY> } | null {
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
      return { sira: parseInt(sira, 10), rawName, puan, results };
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
    const nm = t.match(/([^\n]*TYT[^\n]*?\(\s*[A-Z0-9]+\s*\))/);
    const examName = nm
      ? nm[1].replace(/T[ÜU]RK[İI]YE GENEL[İI]/i, '').replace(/\s+/g, ' ').trim()
      : null;

    const records: ExtractedPdfRecord[] = [];
    let expected: number | null = null;

    // Satır sonlarına güvenmeden: başlıktaki son "D. Y. N." ifadesinden sonrası veri bölgesi.
    // Her satır:  SIRA [ŞB harfi] <rakamlar ... son net "83,50"> <AD SOYAD>
    let data = t;
    const headEnd = [...t.matchAll(/D\.\s*Y\.\s*N\./g)].pop();
    if (headEnd?.index != null) data = t.slice(headEnd.index + headEnd[0].length);
    const rowRe = /(\d+\s*\p{Lu}?\s*\d[^\p{L}]*?\d,\d{2})\s*(\p{L}[\p{L} .'’-]*?)(?=\s*\d|\s*$)/gu;
    for (const m of data.matchAll(rowRe)) {
      const r = parseListeRow(`${m[1]} ${m[2]}`.trim(), expected);
      if (!r) continue;
      expected = r.sira + 1;
      records.push({ rawName: r.rawName, examName, examDate, puan: r.puan, results: toResults(r.results) });
    }
    return { examName, examDate, records };
  },
};
