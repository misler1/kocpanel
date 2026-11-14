'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBell, IconTrash, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { syncPush } from '@/lib/push-client';
import { PushToggle } from '@/components/PushToggle';

type Notification = {
  id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string;
  group_count?: number; // aynı sohbetten biriken mesaj sayısı (notifications_grouping.sql)
};

/** Mesajlar sayfası açılınca mesaj bildirimlerini okundu sayar; zil hemen güncellensin diye haber verir. */
export const NOTIFICATIONS_CHANGED = 'kd:notifications-changed';

const KIND_EMOJI: Record<string, string> = {
  basvuru: '🧑‍🎓', koc: '🧑‍🏫', plan_talebi: '📬', gorev: '📋', deneme: '📊', mesaj: '💬', randevu: '📅', hatirlatma: '⏰', hesap: '✅', konu: '📚', rapor: '📊', personel: '👥',
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
  // Zil açıldığında okunmamış olanlar okundu sayılır; bu açılışta yine vurgulu görünsünler diye kimlikleri tutulur
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('notifications').select('*')
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
    window.addEventListener(NOTIFICATIONS_CHANGED, onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onFocus);
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

  // Zili açmak bildirimleri görmek demektir: ışık söner, yeniler bu açılışta vurgulu kalır
  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setFresh(new Set(items.filter((x) => !x.read_at).map((x) => x.id)));
    if (!userId || unread === 0) return;
    const now = new Date().toISOString();
    setItems((p) => p.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    await (supabase as any).from('notifications').update({ read_at: now }).eq('recipient_id', userId).is('read_at', null);
  }

  async function removeItem(id: string) {
    setItems((p) => p.filter((x) => x.id !== id));
    await (supabase as any).from('notifications').delete().eq('id', id);
  }

  async function removeAll() {
    if (!userId || !confirm('Tüm bildirimler silinsin mi?')) return;
    setItems([]);
    await (supabase as any).from('notifications').delete().eq('recipient_id', userId);
  }

  const student = variant === 'student';
  const buttonCls = student
    ? 'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--card)] text-[var(--ink-muted)] transition-colors hover:border-[var(--accent)]/40 hover:text-[var(--accent-dark)]'
    : 'relative rounded-lg p-2 text-[var(--ink-muted)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]';

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={toggleOpen} className={buttonCls}
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
            {items.length > 0 && (
              <button type="button" onClick={removeAll} className="flex items-center gap-1 text-[12px] font-semibold text-[var(--ink-muted)] hover:text-[var(--danger)]">
                <IconTrash size={14} /> Tümünü sil
              </button>
            )}
          </div>
          <PushToggle variant="bell" />
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-[var(--ink-muted)]">{student ? 'Henüz bildirimin yok 😊' : 'Henüz bildirim yok.'}</p>
            ) : items.map((n) => {
              const isNew = !n.read_at || fresh.has(n.id);
              return (
                <div key={n.id} className={`group flex items-start border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--paper)] ${isNew ? 'bg-[var(--accent-soft)]/40' : ''}`}>
                  <button type="button" onClick={() => openItem(n)} className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-4 text-left">
                    <span className="mt-0.5 text-[18px] leading-none">{KIND_EMOJI[n.kind] ?? '🔔'}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] leading-snug text-[var(--ink)] ${isNew ? 'font-bold' : 'font-medium'}`}>
                        {n.title}
                        {(n.group_count ?? 1) > 1 && (
                          <span className="ml-1.5 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--accent-dark)]">{n.group_count} yeni mesaj</span>
                        )}
                      </span>
                      {n.body && <span className="mt-0.5 block text-[12px] leading-snug text-[var(--ink-muted)]">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-[var(--ink-muted)]">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => removeItem(n.id)} aria-label="Bildirimi sil" title="Sil"
                    className="mr-2 mt-2.5 rounded-md p-1.5 text-[var(--ink-muted)] opacity-60 transition hover:bg-rose-50 hover:text-[var(--danger)] hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <IconX size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
