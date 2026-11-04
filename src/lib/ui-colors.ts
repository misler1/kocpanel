// Koç panelinde ortak renk yardımcıları: öğrenci baş harf rozeti ve sınav türü etiketi her sayfada aynı görünsün.

const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700', 'bg-fuchsia-100 text-fuchsia-700', 'bg-orange-100 text-orange-700',
];

// AVATAR_COLORS ile aynı sırada: kartların üst şeridi rozetle aynı renk ailesinden olsun
const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-500', 'from-violet-400 to-purple-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500', 'from-indigo-400 to-violet-500',
  'from-teal-400 to-cyan-500', 'from-fuchsia-400 to-pink-500', 'from-orange-400 to-red-400',
];

function colorIndex(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % AVATAR_COLORS.length;
}

/** Aynı öğrenci her yerde aynı renkte görünür (kimliğinden türetilir) */
export function avatarColor(id: string) {
  return AVATAR_COLORS[colorIndex(id)];
}

/** avatarColor ile aynı renk ailesinden degrade (bg-gradient-to-* ile kullanılır) */
export function avatarGradient(id: string) {
  return AVATAR_GRADIENTS[colorIndex(id)];
}

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toLocaleUpperCase('tr')).join('');

const TRACK_LABELS: Record<string, string> = {
  YKS_SAY: 'YKS · SAY', YKS_SOZ: 'YKS · SÖZ', YKS_EA: 'YKS · EA', YKS_DIL: 'YKS · DİL', LGS: 'LGS', DIGER: 'Diğer',
};

/** Sınav türü etiketi: YKS mavi, LGS mor, diğerleri turkuaz */
export function trackPill(track: string | null | undefined) {
  if (!track) return null;
  const label = TRACK_LABELS[track] ?? track;
  if (track === 'LGS') return { label, cls: 'bg-violet-100 text-violet-700' };
  if (track.startsWith('YKS')) return { label, cls: 'bg-sky-100 text-sky-700' };
  return { label, cls: 'bg-teal-100 text-teal-700' };
}
