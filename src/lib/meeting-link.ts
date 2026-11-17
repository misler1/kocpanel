// Online görüşme bağlantıları (Google Meet, Zoom, Teams, Jitsi…). Randevunun "Yer / bağlantı" alanında tutulur;
// öğrencinin programındaki görüşme görevine de aynen taşınır (resource_name).

export function isMeetingUrl(v: string | null | undefined): v is string {
  return !!v && /^https:\/\/[^\s]+$/i.test(v.trim());
}

/** Bağlantıdan platform adı: düğme ve takvimde gösterilir */
export function meetingPlatform(url: string): string {
  const h = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
  if (h.includes('meet.google')) return 'Google Meet';
  if (h.includes('zoom.')) return 'Zoom';
  if (h.includes('teams.microsoft') || h.includes('teams.live')) return 'Microsoft Teams';
  if (h.includes('jit.si') || h.includes('jitsi')) return 'Jitsi';
  if (h.includes('whereby')) return 'Whereby';
  if (h.includes('webex')) return 'Webex';
  return 'Online görüşme';
}

/** Hesap gerektirmeyen ücretsiz Jitsi odası (tahmin edilemeyen adla) */
export function newJitsiRoom(): string {
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
  return `https://meet.jit.si/KocDefterim-${rnd}`;
}
