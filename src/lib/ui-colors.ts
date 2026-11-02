// Koç panelinde ortak renk yardımcıları: öğrenci baş harf rozeti ve sınav türü etiketi her sayfada aynı görünsün.

const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700', 'bg-fuchsia-100 text-fuchsia-700', 'bg-orange-100 text-orange-700',
];

/** Aynı öğrenci her yerde aynı renkte görünür (kimliğinden türetilir) */
export function avatarColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
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
