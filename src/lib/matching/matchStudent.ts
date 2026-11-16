// Türkçe karakterleri sadeleştirip küçük harfe çevirir, fazla boşlukları temizler
export function normalizeTrName(input: string): string {
  return (input ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein mesafesi
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// 0-1 arası benzerlik skoru (1 = tam eşleşme)
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export interface StudentCandidate {
  id: string;
  full_name: string;
}

export interface MatchResult {
  studentId: string | null;
  studentName: string | null;
  score: number; // 0-1
  isAmbiguous: boolean; // birden fazla yakın aday varsa
  alternatives: { id: string; full_name: string; score: number }[];
}

// İki kelimenin benzerliği: kesik yazım (KAHRA ↔ Kahraman) ve sesli harfsiz kısaltma (YLMZ ↔ Yılmaz) da eşleşir
const consonants = (w: string) => w.replace(/[aeiou]/g, '');
function wordScore(a: string, b: string): number {
  const sc = similarity(a, b);
  if (sc >= 0.85) return sc;
  const [sh, lo] = a.length <= b.length ? [a, b] : [b, a];
  if (sh.length >= 4 && lo.startsWith(sh)) return 0.86;
  if (sh.length >= 3 && consonants(sh) === consonants(lo) && consonants(sh).length >= 3) return 0.86;
  return sc;
}

// Kelime bazında benzerlik: kısa adın her kelimesi uzun adda (farklı bir kelimeyle) bulunuyorsa
// iki isimli öğrencinin sistemde tek ismiyle kayıtlı olması (Yusuf Kahraman ↔ YUSUF SELİM KAHRAMAN) yüksek puan alır.
function tokenScore(a: string, b: string): number {
  const ta = a.split(' ').filter(Boolean);
  const tb = b.split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  // Bitişik yazılmış ad (EMİRHANAKTUG ↔ Emirhan Aktuğ)
  if ((ta.length === 1) !== (tb.length === 1) && similarity(ta.join(''), tb.join('')) >= 0.9) return 0.9;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length < 2) return 0; // tek kelimelik ad: aşağıda adaylar arasında tekliğe bakılır
  const used = new Set<number>();
  for (const w of short) {
    let bi = -1, bs = 0;
    long.forEach((l, i) => { if (used.has(i)) return; const sc = wordScore(w, l); if (sc > bs) { bs = sc; bi = i; } });
    if (bs < 0.85) return 0;
    used.add(bi);
  }
  // soyadlar da eşleşiyorsa daha güvenilir
  return similarity(short[short.length - 1], long[long.length - 1]) >= 0.85 ? 0.93 : 0.88;
}

// Bir isim için öğrenci listesinden en iyi eşleşmeyi bulur
export function matchStudentName(rawName: string, students: StudentCandidate[]): MatchResult {
  const target = normalizeTrName(rawName);
  const words = target.split(' ').filter(Boolean);
  // Tek kelimelik ad (ör. yalnızca soyadı ya da adı yazılmış): adaylardan yalnızca birinde bu kelime varsa önerilir
  const single = words.length === 1
    ? students.filter((s) => normalizeTrName(s.full_name).split(' ').includes(words[0]))
    : [];
  const scored = students
    .map((s) => {
      const n = normalizeTrName(s.full_name);
      let score = Math.max(similarity(target, n), tokenScore(target, n));
      if (single.length === 1 && single[0].id === s.id) score = Math.max(score, 0.86);
      else if (single.length > 1 && single.some((x) => x.id === s.id)) score = Math.max(score, 0.65);
      return { ...s, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];

  // Eşik değerler: 0.85+ güvenilir tam eşleşme kabul edilir
  // 0.6-0.85 arası "muhtemel ama onay iste"
  // 0.6 altı eşleşme yok say
  const AUTO_THRESHOLD = 0.85;
  const SUGGEST_THRESHOLD = 0.6;

  if (!best || best.score < SUGGEST_THRESHOLD) {
    return { studentId: null, studentName: null, score: best?.score ?? 0, isAmbiguous: false, alternatives: scored.slice(0, 5) };
  }

  const isAmbiguous = !!second && best.score - second.score < 0.08 && second.score >= SUGGEST_THRESHOLD;

  return {
    studentId: best.score >= AUTO_THRESHOLD && !isAmbiguous ? best.id : null,
    studentName: best.full_name,
    score: best.score,
    isAmbiguous,
    alternatives: scored.slice(0, 5),
  };
}