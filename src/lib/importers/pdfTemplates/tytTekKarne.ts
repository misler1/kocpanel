import type { PdfTemplate, ExtractedPdfRecord } from './types';
import { parseQuestions } from './questions';
import { parseRankings } from './rankings';
import { fmtNet, netYKS, trDateToIso, trUpper, toResults, type DY } from './shared';

// ───────────────────────── Şablon: TYT tek öğrenci karnesi ("DERS ANALİZİ") ─────────────────────────

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
  // Alt toplamlar: doğru/yanlış sonuçlarına girmez, yalnızca ORT (ortalama) için okunur
  { key: 'sosyal', re: /^TYT-?\s*SOSYAL/, soru: 20 },
  { key: 'fen', re: /^TYT-?\s*FEN/, soru: 20 },
  { key: 'toplam', re: /^TOPLAM/, soru: 120 },
];
const EXTRA_KEYS = new Set(['sosyal', 'fen', 'toplam']);

/** "SORU DOĞRU YANLIŞ BOŞ NET ORT" – boş hücreler hiç yazılmıyor, rakamlar bitişik olabilir. */
function solveTekRow(rest: string, soru: number): (DY & { ort: number | null }) | null {
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
          const tail = s.slice(exp.length); // ORT sütunu
          if (tail === '' || /^-?\d{1,3},\d{2}$/.test(tail)) return { d, y, ort: tail ? parseFloat(tail.replace(',', '.')) : null };
        }
    }
  }
  return null;
}

export const tytTekKarneTemplate: PdfTemplate = {
  id: 'tyt-tek-karne',
  label: 'TYT – Tek öğrenci karnesi (Ders Analizi)',
  examType: 'TYT',
  canParse: (t) => /DERS ANAL[İI]Z[İI]/.test(t) && /Ad Soyad/.test(t) && /TYT-?\s*T[ÜU]RK[ÇC]E/i.test(t),
  parse: (t, spaced) => {
    const records: ExtractedPdfRecord[] = [];
    const blocks = t.split(/(?=Ad Soyad)/).filter((b) => /^Ad Soyad/.test(b));
    const spacedBlocks = spaced ? spaced.split(/(?=Ad Soyad)/).filter((b) => /^Ad Soyad/.test(b)) : [];
    for (const [bi, block] of blocks.entries()) {
      const nm = block.match(/Ad Soyad\s*(.+?)\s*Numara/);
      if (!nm) continue;
      const rawName = nm[1].replace(/\s+/g, ' ').trim();
      const examName =
        block.match(/Sınav Adı\s*([\s\S]*?)\s*Kitapçık/)?.[1].replace(/\s+/g, ' ').trim() || null;
      const examDate = trDateToIso(block.match(/Sınav Tarihi\s*(\d{1,2}\.\d{1,2}\.\d{4})/)?.[1]);

      const si = block.search(/DERS ANAL[İI]Z[İI]/);
      const ei = block.search(/PUAN VE SIRALAMALAR/);
      const section = block.slice(si, ei > si ? ei : undefined);

      const map: Record<string, DY> = {};
      const averages: Record<string, number> = {};
      // Satır sonlarına güvenmeden: etiketleri bulup her etiketle bir sonraki etiket arasını al
      const up = trUpper(section);
      const labelRe =
        /(?<![A-ZÇĞİÖŞÜ])(TYT-?\s*T[ÜU]RK[ÇC]E|TAR[İI]H|CO[ĞG]RAFYA|FELSEFE|D[İI]N\s*K[ÜU]LT[ÜU]R[ÜU]|D[İI]N|TYT-?\s*SOSYAL\s*B[İI]L[İI]MLER|TYT-?\s*MATEMAT[İI]K|GEOMETR[İI]|F[İI]Z[İI]K|K[İI]MYA|B[İI]YOLOJ[İI]|TYT-?\s*FEN\s*B[İI]L[İI]MLER[İI]|TOPLAM)/g;
      const hits = [...up.matchAll(labelRe)];
      hits.forEach((h, i) => {
        const label = h[1];
        const def = TEK_SUBJECTS.find((d) => d.re.test(label));
        if (!def || map[def.key] || def.key in averages) return;
        const from = (h.index ?? 0) + label.length;
        const to = i + 1 < hits.length ? hits[i + 1].index ?? up.length : up.length;
        const row = solveTekRow(up.slice(from, to), def.soru);
        if (!row) return;
        if (row.ort !== null) averages[def.key] = row.ort;
        if (!EXTRA_KEYS.has(def.key)) map[def.key] = { d: row.d, y: row.y };
      });
      if (Object.keys(map).length < 3) continue;

      const pm = block.match(/PUAN T[ÜU]R[ÜU][\s\S]*?\n?\s*TYT\s*(\d{2,3},\d{2})/);
      const puan = pm ? parseFloat(pm[1].replace(',', '.')) : undefined;
      // Konu / kazanım analizi (karnenin 2. sayfası)
      const ki = block.search(/KONU ANAL[İI]Z[İI]/);
      const questions = ki >= 0 ? parseQuestions(block.slice(ki)) : [];
      // Sıralamalar (genel / kurum / şube / sınıf / ÖSYM…) — mümkünse hücreleri boşluklu metinden
      const rankings = parseRankings(block, spacedBlocks[bi]);
      records.push({
        rawName, examName, examDate, puan, results: toResults(map),
        ...(questions.length ? { questions } : {}),
        ...(Object.keys(averages).length ? { averages } : {}),
        ...(rankings ? { rankings } : {}),
      });
    }
    return { examName: records[0]?.examName ?? null, examDate: records[0]?.examDate ?? null, records };
  },
};