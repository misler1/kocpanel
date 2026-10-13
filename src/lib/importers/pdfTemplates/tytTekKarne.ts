import type { PdfTemplate, ExtractedPdfRecord } from './types';
import { fmtNet, netYKS, trDateToIso, trUpper, toResults, type DY } from './shared';

const TEK_SUBJECTS: { key: string; re: RegExp; soru: number }[] = [
  { key: 'turkce', re: /^TYT-?\s*T[ÜU]RK[ÇC]E/, soru: 40 },
  { key: 'tarih', re: /^TAR[İI]H/, soru: 5 },
  { key: 'cografya', re: /^CO[ĞG]RAFYA/, soru: 5 },
  { key: 'felsefe', re: /^FELSEFE/, soru: 5 },
  { key: 'din', re: /^D[İI]N/, soru: 5 },
  { key: 'matematik', re: /^TYT-?\s*MATEMAT[İI]K/, soru: 40 },
  { key: 'geometri', re: /^GEOMETR[İI]/, soru: 10 },
  { key: 'fizik', re: /^F[İI]Z[İI]K/, soru: 7 },
  { key: 'kimya', re: /^K[İI]MYA/, soru: 7 },
  { key: 'biyoloji', re: /^B[İI]YOLOJ[İI]/, soru: 6 },
];
function solveTekRow(rest: string, soru: number): DY | null {
  const s = rest.replace(/\s+/g, '');
  if (!s.startsWith(String(soru))) return null;
  for (let d = soru; d >= 0; d--) {
    for (let y = 0; y <= soru - d; y++) {
      const b = soru - d - y;
      const net = fmtNet(netYKS(d, y));
      for (const ys of y === 0 ? ['', '0'] : [String(y)])
        for (const bs of b === 0 ? ['', '0'] : [String(b)]) {
          const exp = `${soru}${d}${ys}${bs}${net}`;
          if (!s.startsWith(exp)) continue;
          const tail = s.slice(exp.length);
          if (tail === '' || /^-?\d{1,3},\d{2}$/.test(tail)) return { d, y };
        }
    }
  }
  return null;
}
/** PDF'ten gelen metinde "İ" bazen I + birleşik nokta (U+0307) olarak gelir; [İI] regex'leri tutsun diye NFC'ye çevir. */
const norm = (t: string) => t.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '');

export const tytTekKarneTemplate: PdfTemplate = {
  id: 'tyt-tek-karne',
  label: 'TYT – Tek öğrenci karnesi (Ders Analizi)',
  examType: 'TYT',
  canParse: (raw: string) => {
    const t = norm(raw);
    return /DERS ANAL[İI]Z[İI]/.test(t) && /Ad Soyad/.test(t) && /TYT-?\s*T[ÜU]RK[ÇC]E/i.test(t);
  },
  parse: (raw: string) => {
    const t = norm(raw);
    const records: ExtractedPdfRecord[] = [];
    const blocks = t.split(/(?=Ad Soyad)/).filter((b) => /^Ad Soyad/.test(b));
    for (const block of blocks) {
      const nm = block.match(/Ad Soyad\s*(.+?)\s*Numara/);
      if (!nm) continue;
      const rawName = nm[1].replace(/\s+/g, ' ').trim();
      const examName = block.match(/Sınav Adı\s*([\s\S]*?)\s*Kitapçık/)?.[1].replace(/\s+/g, ' ').trim() || null;
      const examDate = trDateToIso(block.match(/Sınav Tarihi\s*(\d{1,2}\.\d{1,2}\.\d{4})/)?.[1]);
      const si = block.search(/DERS ANAL[İI]Z[İI]/);
      const ei = block.search(/PUAN VE SIRALAMALAR/);
      const section = block.slice(si, ei > si ? ei : undefined);
      const map: Record<string, DY> = {};
      const up = trUpper(section);
      const labelRe = /(?<![A-ZÇĞİÖŞÜ])(TYT-?\s*T[ÜU]RK[ÇC]E|TAR[İI]H|CO[ĞG]RAFYA|FELSEFE|D[İI]N\s*K[ÜU]LT[ÜU]R[ÜU]|D[İI]N|TYT-?\s*SOSYAL\s*B[İI]L[İI]MLER|TYT-?\s*MATEMAT[İI]K|GEOMETR[İI]|F[İI]Z[İI]K|K[İI]MYA|B[İI]YOLOJ[İI]|TYT-?\s*FEN\s*B[İI]L[İI]MLER[İI]|TOPLAM)/g;
      const hits = [...up.matchAll(labelRe)];
      hits.forEach((h, i) => {
        const label = h[1];
        const def = TEK_SUBJECTS.find((d) => d.re.test(label));
        if (!def || map[def.key]) return;
        const from = (h.index ?? 0) + label.length;
        const to = i + 1 < hits.length ? hits[i + 1].index ?? up.length : up.length;
        const dy = solveTekRow(up.slice(from, to), def.soru);
        if (dy) map[def.key] = dy;
      });
      if (Object.keys(map).length < 3) continue;
      const pm = block.match(/PUAN T[ÜU]R[ÜU][\s\S]*?\n?\s*TYT\s*(\d{2,3},\d{2})/);
      const puan = pm ? parseFloat(pm[1].replace(',', '.')) : undefined;
      records.push({ rawName, examName, examDate, puan, results: toResults(map) });
    }
    return { examName: records[0]?.examName ?? null, examDate: records[0]?.examDate ?? null, records };
  },
};