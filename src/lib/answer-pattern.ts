// Soru soru cevaplardan (question_results, ks olmayanlar) test bazında cevap çizelgesi ve boş bırakma deseni.
// Örn. sayısalcı öğrenci matematikte 6. sorudan sonra hiç işaretlememişse: süre yetmemiş ya da testi bırakmış olabilir.

export type AnswerCell = { no: number; s: string; dc: string; oc: string | null; r: 'D' | 'Y' | 'B' };
export type TestSheet = {
  test: string;          // "Matematik"
  cells: AnswerCell[];   // test içindeki sırasıyla
  d: number; y: number; b: number;
  lastAnswered: number;  // son işaretlenen sorunun test içi numarası (0: hiç)
  trailingBlank: number; // sondaki ardışık boş soru sayısı
  note: string | null;   // dikkat çekici desen varsa açıklama
};

type Q = { s: string; n: number; dc?: string; oc?: string | null; r: 'D' | 'Y' | 'B'; ks?: boolean };

// TYT testleri: ders anahtarları ve test içindeki başlangıç sırası (kitapçık sırası)
const TYT_TESTS: { test: string; parts: { s: string; offset: number }[] }[] = [
  { test: 'Türkçe', parts: [{ s: 'turkce', offset: 0 }] },
  { test: 'Sosyal Bilimler', parts: [{ s: 'tarih', offset: 0 }, { s: 'cografya', offset: 5 }, { s: 'felsefe', offset: 10 }, { s: 'din', offset: 15 }] },
  { test: 'Matematik', parts: [{ s: 'matematik', offset: 0 }, { s: 'geometri', offset: 30 }] },
  { test: 'Fen Bilimleri', parts: [{ s: 'fizik', offset: 0 }, { s: 'kimya', offset: 7 }, { s: 'biyoloji', offset: 14 }] },
];

function summarize(test: string, cells: AnswerCell[]): TestSheet {
  cells.sort((a, b) => a.no - b.no);
  const d = cells.filter((c) => c.r === 'D').length;
  const y = cells.filter((c) => c.r === 'Y').length;
  const b = cells.length - d - y;
  let trailing = 0;
  for (let i = cells.length - 1; i >= 0 && cells[i].r === 'B'; i--) trailing++;
  const answered = cells.filter((c) => c.r !== 'B');
  const lastAnswered = answered.length ? answered[answered.length - 1].no : 0;
  let note: string | null = null;
  if (answered.length === 0) note = `${test} testinde hiç işaretleme yok.`;
  else if (trailing >= 5 && trailing / cells.length >= 0.15)
    note = `${test} testinde ${lastAnswered}. sorudan sonra hiç işaretleme yok (son ${trailing} soru boş) — süre yetmemiş, test sırası ya da bırakma olabilir.`;
  return { test, cells, d, y, b, lastAnswered, trailingBlank: trailing, note };
}

export function answerSheets(examType: string, questions: Q[] | null | undefined): TestSheet[] {
  const qs = (questions ?? []).filter((q) => !q.ks && q.r);
  if (!qs.length) return [];
  const out: TestSheet[] = [];
  if (examType === 'TYT') {
    for (const t of TYT_TESTS) {
      const cells: AnswerCell[] = [];
      for (const p of t.parts) {
        for (const q of qs.filter((x) => x.s === p.s)) cells.push({ no: p.offset + q.n, s: q.s, dc: q.dc ?? '', oc: q.oc ?? null, r: q.r });
      }
      if (cells.length) out.push(summarize(t.test, cells));
    }
    return out;
  }
  // Diğer sınavlarda her ders ayrı test sayılır
  const keys = Array.from(new Set(qs.map((q) => q.s)));
  for (const k of keys) {
    const cells = qs.filter((q) => q.s === k).map((q) => ({ no: q.n, s: q.s, dc: q.dc ?? '', oc: q.oc ?? null, r: q.r }));
    out.push(summarize(k.charAt(0).toLocaleUpperCase('tr') + k.slice(1), cells));
  }
  return out;
}
