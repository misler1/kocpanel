// Paylaşılan bağlantıyı tanır: bilinen platformlar sayfada oynatılabilir (iframe), diğerleri bağlantı kartı olur.
// Yalnızca bağlantıdaki kimlik alınır ve platformun resmi gömme adresi kurulur; kullanıcı adresi iframe'e verilmez.

export type Embed = {
  provider: 'youtube' | 'vimeo' | 'instagram' | 'x' | 'tiktok' | 'spotify' | 'link';
  label: string; // "YouTube", "Instagram" ...
  src: string | null; // gömme adresi (link için null)
  /** Oynatıcının en/boy oranı ya da sabit yüksekliği */
  aspect?: string;
  height?: number;
  host: string;
};

const ID = /^[A-Za-z0-9_-]+$/;

export function parseEmbed(raw: string): Embed | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^(www\.|m\.|mobile\.)/, '').toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  const ok = (id: string | undefined | null): id is string => !!id && ID.test(id);

  // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/
  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    let id: string | null = null;
    let vertical = false;
    if (host === 'youtu.be') id = parts[0] ?? null;
    else if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0] ?? '')) { id = parts[1] ?? null; vertical = parts[0] === 'shorts'; }
    if (ok(id)) {
      const t = Number.parseInt(u.searchParams.get('t') ?? u.searchParams.get('start') ?? '', 10);
      return {
        provider: 'youtube', label: 'YouTube', host,
        src: `https://www.youtube-nocookie.com/embed/${id}?rel=0${t > 0 ? `&start=${t}` : ''}`,
        aspect: vertical ? '9 / 16' : '16 / 9',
      };
    }
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parts.find((p) => /^\d+$/.test(p));
    if (id) return { provider: 'vimeo', label: 'Vimeo', host, src: `https://player.vimeo.com/video/${id}`, aspect: '16 / 9' };
  }

  // Instagram: /p/KOD, /reel/KOD, /reels/KOD, /tv/KOD (kullanıcı adlı biçim: /kullanici/p/KOD)
  if (host === 'instagram.com') {
    const i = parts.findIndex((p) => ['p', 'reel', 'reels', 'tv'].includes(p));
    const code = i >= 0 ? parts[i + 1] : undefined;
    if (ok(code)) {
      const type = parts[i] === 'p' || parts[i] === 'tv' ? 'p' : 'reel';
      return { provider: 'instagram', label: 'Instagram', host, src: `https://www.instagram.com/${type}/${code}/embed/captioned/`, height: type === 'reel' ? 720 : 640 };
    }
  }

  // X / Twitter: /kullanici/status/123
  if (host === 'x.com' || host === 'twitter.com') {
    const i = parts.indexOf('status');
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^\d+$/.test(id)) {
      return { provider: 'x', label: 'X (Twitter)', host, src: `https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=true&lang=tr`, height: 560 };
    }
  }

  // TikTok: /@kullanici/video/123
  if (host === 'tiktok.com') {
    const i = parts.indexOf('video');
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (id && /^\d+$/.test(id)) return { provider: 'tiktok', label: 'TikTok', host, src: `https://www.tiktok.com/embed/v2/${id}`, height: 740 };
  }

  // Spotify: /episode|track|show|playlist|album/ID (dil öneki olabilir: /intl-tr/track/ID)
  if (host === 'open.spotify.com') {
    const i = parts.findIndex((p) => ['episode', 'track', 'show', 'playlist', 'album'].includes(p));
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (ok(id)) {
      const type = parts[i];
      return { provider: 'spotify', label: 'Spotify', host, src: `https://open.spotify.com/embed/${type}/${id}`, height: type === 'track' ? 152 : 232 };
    }
  }

  return { provider: 'link', label: host, host, src: null };
}

/** YouTube araması (öneri konuları için): her zaman çalışan gerçek bir adres */
export function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
