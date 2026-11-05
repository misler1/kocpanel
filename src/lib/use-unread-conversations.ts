'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Menüdeki "Mesajlar" rozeti: okunmamış mesajı olan sohbet (kişi/grup) sayısı.
// Sayfadaki bütün menüler (masaüstü, telefon, öğrenci) aynı sayacı paylaşır; tek bir canlı kanal açılır.
// Yeni mesaj send_message'da alıcıya 'mesaj' bildirimi ürettiği için bildirim tablosu dinlenir;
// sohbet açılınca MessagesApp markMessagesRead() ile sayacı hemen tazeler.

const READ_EVENT = 'kd:messages-read';

let count = 0;
let userId: string | null = null;
let channel: any = null;
let started = false;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l());
}

async function doRefresh() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { emit(0); return; }
  if (user.id !== userId) {
    // Aynı sekmede başka hesaba geçildi: kanal yeni kullanıcı için kurulur
    if (channel) supabase.removeChannel(channel);
    userId = user.id;
    channel = supabase
      .channel(`unread-conv:${user.id}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, () => refreshUnread())
      .subscribe();
  }
  const { data, error } = await (supabase as any).rpc('my_conversations');
  if (error) return;
  emit((data ?? []).filter((c: any) => (c.unread ?? 0) > 0).length);
}

export function refreshUnread() {
  // Art arda gelen tetikler tek istekte birleşir
  if (!pending) pending = doRefresh().finally(() => { pending = null; });
  return pending;
}

/** Sohbet okundu olarak işaretlenince çağrılır (menü rozeti hemen güncellensin). */
export function markMessagesRead() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(READ_EVENT));
}

function start() {
  if (started) return;
  started = true;
  window.addEventListener('focus', () => refreshUnread());
  window.addEventListener(READ_EVENT, () => refreshUnread());
  setInterval(() => refreshUnread(), 90_000); // canlı bağlantı kopsa bile güncel kalsın
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useUnreadConversations() {
  const pathname = usePathname();
  useEffect(() => {
    start();
    refreshUnread();
  }, [pathname]);
  return useSyncExternalStore(subscribe, () => count, () => 0);
}
