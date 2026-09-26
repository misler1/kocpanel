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

// Bir isim için öğrenci listesinden en iyi eşleşmeyi bulur
export function matchStudentName(rawName: string, students: StudentCandidate[]): MatchResult {
  const target = normalizeTrName(rawName);
  const scored = students
    .map((s) => ({ ...s, score: similarity(target, normalizeTrName(s.full_name)) }))
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