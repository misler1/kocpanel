// Koç panelinde ortak renk yardımcıları: öğrenci baş harf rozeti ve sınav türü etiketi her sayfada aynı görünsün.

// Sade tema: rozetler tek renk (petrol mavisinin açık tonu); kimlik ayrımı baş harflerle
const AVATAR_COLORS = ['bg-[var(--accent-soft)] text-[var(--accent-dark)]'];

// AVATAR_COLORS ile aynı sırada: kartların üst şeridi rozetle aynı renk ailesinden olsun
const AVATAR_GRADIENTS = ['from-[#1F8C84] to-[#0F766E]'];

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
