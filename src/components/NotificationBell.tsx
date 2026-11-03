'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBell, IconChecks } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { syncPush } from '@/lib/push-client';
import { PushToggle } from '@/components/PushToggle';

type Notification = {
  id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string;
};

const KIND_EMOJI: Record<string, string> = {
  basvuru: '🧑‍🎓', koc: '🧑‍🏫', plan_talebi: '📬', gorev: '📋', deneme: '📊', mesaj: '💬', randevu: '📅', hatirlatma: '⏰',
};

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'şimdi';
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/** Panel içi bildirim zili. variant: koç paneli sade, öğrenci paneli yuvarlak/renkli görünüm. */
export function NotificationBell({ variant = 'coach' }: { variant?: 'coach' | 'student' }) {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('notifications').select('id, kind, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false }).limit(30);
    if (!error) setItems(data ?? []);
  }, [supabase]);

  useEffect(() => {
    let channel: any = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    // Kurulum asenkron: bileşen bu arada kapanırsa (React geliştirme modunda çift çalıştırma, sayfa geçişi)
    // abonelik hiç açılmamalı; aksi halde temizlenemeyen kanal bir sonraki kurulumda hataya yol açar.
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      syncPush();
      await load();
      if (cancelled) return;
      // Kanal adı her bileşen örneği için benzersiz: aynı ada sahip kanal istemcide tekrar kullanılır ve
      // abone olunmuş kanala yeni dinleyici eklenemez (zil sayfada iki kez yer alırsa da çakışmasın)
      channel = supabase
        .channel(`notifications:${user.id}:${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, () => load())
        .subscribe();
      timer = setInterval(load, 90_000); // Realtime kopsa bile güncel kalsın
    })();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      if (timer) clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
    // supabase istemcisi her render'da yeniden oluşturulur; abonelik yalnızca bir kez kurulmalı
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  async function openItem(n: Notification) {
    setOpen(false);
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      await (supabase as any).from('notifications').update({ read_at: now }).eq('id', n.id);
    }
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    if (!userId || unread === 0) return;
    const now = new Date().toISOString();
    setItems((p) => p.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    await (supabase as any).from('notifications').update({ read_at: now }).eq('recipient_id', userId).is('read_at', null);
  }

  const student = variant === 'student';
  const buttonCls = student
    ? 'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--card)] text-[var(--ink-muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent-dark)]'
    : 'relative rounded-lg p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]';

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={buttonCls}
        aria-label={unread ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler'} aria-expanded={open}>
        <IconBell size={student ? 19 : 18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10.5px] font-bold leading-none text-white ring-2 ring-[var(--card)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        // Telefonda zilin sağında başka düğmeler olduğu için kutu zile değil ekrana hizalanır (aksi halde soldan taşar)
        <div className={`z-50 overflow-hidden border border-[var(--border)] bg-[var(--card)] shadow-xl max-sm:fixed max-sm:inset-x-3 max-sm:top-[68px] sm:absolute sm:right-0 sm:mt-2 sm:w-[22rem] ${student ? 'rounded-3xl' : 'rounded-xl'}`}>
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className={`text-[14px] text-[var(--ink)] ${student ? 'font-extrabold' : 'font-semibold'}`}>Bildirimler</span>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-dark)] hover:underline">
                <IconChecks size={14} /> Tümünü okundu say
              </button>
            )}
          </div>
          <PushToggle variant="bell" />
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-[var(--ink-muted)]">{student ? 'Henüz bildirimin yok 😊' : 'Henüz bildirim yok.'}</p>
            ) : items.map((n) => (
              <button key={n.id} type="button" onClick={() => openItem(n)}
                className={`flex w-full items-start gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--paper)] ${n.read_at ? '' : 'bg-[var(--accent-soft)]/40'}`}>
                <span className="mt-0.5 text-[18px] leading-none">{KIND_EMOJI[n.kind] ?? '🔔'}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] leading-snug text-[var(--ink)] ${n.read_at ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-[12px] leading-snug text-[var(--ink-muted)]">{n.body}</span>}
                  <span className="mt-1 block text-[11px] text-[var(--ink-muted)]">{timeAgo(n.created_at)}</span>
                </span>
                {!n.read_at && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
