'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IconArrowLeft, IconSend, IconPlus, IconUsersGroup, IconSearch, IconDotsVertical, IconBan, IconX, IconCheck, IconSpeakerphone, IconChecks, IconPencil, IconTrash, IconArrowBackUp, IconCopy, IconEye, IconEyeOff, IconBellOff, IconBell, IconMoodSmile,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { markMessagesRead } from '@/lib/use-unread-conversations';
import { NOTIFICATIONS_CHANGED } from '@/components/NotificationBell';
import { BulkMessage } from './BulkMessage';
import { EmojiPicker, QUICK_REACTIONS } from './EmojiPicker';

type Conv = {
  id: string; kind: 'direct' | 'group'; title: string | null; other_id: string | null; other_role: string | null;
  member_count: number; created_by: string | null; last_message: string | null; last_sender: string | null;
  last_at: string; unread: number;
  // supabase/mesaj_kisi_ayarlari.sql çalıştırıldıysa gelir
  muted_until?: string | null; read_receipts?: boolean; read_receipts_custom?: boolean;
};

const MUTE_FOREVER_YEAR = 9999;
const MUTE_OPTIONS: { label: string; hours: number | null }[] = [
  { label: '8 saat', hours: 8 }, { label: '1 gün', hours: 24 }, { label: '1 hafta', hours: 24 * 7 }, { label: '1 ay', hours: 24 * 30 }, { label: 'Süresiz', hours: null },
];
function addHours(hours: number) {
  const d = new Date();
  d.setTime(d.getTime() + hours * 3600_000);
  return d.toISOString();
}
function muteText(until: string) {
  const d = new Date(until);
  if (d.getFullYear() >= MUTE_FOREVER_YEAR) return 'süresiz';
  return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' kadar';
}
type Msg = { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; edited_at?: string | null; deleted_at?: string | null; deleted_by?: string | null };

const EDIT_WINDOW_MS = 24 * 3600 * 1000; // supabase/mesaj_okundu_duzenleme.sql ile aynı
type Member = { id: string; full_name: string; role: string; blocked: boolean };
// supabase/mesaj_tepkileri.sql çalıştırıldıysa gelir
type Reaction = { message_id: string; conversation_id: string; profile_id: string; emoji: string };
type ReactionAlert = { conversation_id: string; cnt: number; last_emoji: string; last_by: string | null };
type Contact = { id: string; full_name: string; role: string; kurum: string | null; sinif: string | null; is_my_student: boolean };

const ROLE_LABEL: Record<string, string> = { koc: 'Koç', ogretmen: 'Öğretmen', ogrenci: 'Öğrenci', veli: 'Veli' };

const missingSetup = (e: any) => e?.code === 'PGRST202' || /could not find the function/i.test(e?.message ?? '');

function initials(name?: string | null) {
  return (name ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function shortTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 7) return d.toLocaleDateString('tr-TR', { weekday: 'short' });
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function MessagesApp({ variant, meId, isStaff }: { variant: 'coach' | 'student'; meId: string; isStaff: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const student = variant === 'student';

  const [convs, setConvs] = useState<Conv[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [setupError, setSetupError] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(params.get('c'));
  const [messages, setMessages] = useState<Msg[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState<null | 'direct' | 'group' | 'add'>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  // Okundu / düzenleme (supabase/mesaj_okundu_duzenleme.sql çalıştırılmadıysa extras = false)
  const [extras, setExtras] = useState(true);
  const [receipts, setReceipts] = useState(true);
  const [receiptsReady, setReceiptsReady] = useState(false); // ayar okunabildi (SQL çalıştırılmış)
  const [muteMenu, setMuteMenu] = useState(false);
  const [readState, setReadState] = useState<{ profile_id: string; read_at: string | null }[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [actionAt, setActionAt] = useState(0); // menü açıldığı an (24 saat düzenleme süresi buna göre)
  const [editing, setEditing] = useState<Msg | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionsReady, setReactionsReady] = useState(false);
  const [alerts, setAlerts] = useState<Map<string, ReactionAlert>>(new Map());
  const [composerEmoji, setComposerEmoji] = useState(false);
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(activeId); // canlı abonelik açık sohbeti buradan okur

  const active = convs.find((c) => c.id === activeId) ?? null;
  const convReceipts = active?.read_receipts ?? receipts; // bu sohbetteki geçerli okundu ayarı
  const perConv = active?.read_receipts !== undefined;      // sohbete özel ayarlar kullanılabilir
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const blockedIds = useMemo(() => new Set(members.filter((m) => m.blocked).map((m) => m.id)), [members]);

  const loadConvs = useCallback(async () => {
    const [{ data, error: err }, al] = await Promise.all([
      (supabase as any).rpc('my_conversations'),
      (supabase as any).rpc('my_reaction_alerts'),
    ]);
    if (err) { if (missingSetup(err)) setSetupError(true); setLoaded(true); return; }
    setConvs(data ?? []);
    // Açık sohbet zaten görülüyor: onun tepki işareti gösterilmez
    if (!al.error) setAlerts(new Map(((al.data ?? []) as ReactionAlert[]).filter((a) => a.conversation_id !== activeRef.current).map((a) => [a.conversation_id, a])));
    setLoaded(true);
  }, [supabase]);

  const loadReadState = useCallback(async (id: string) => {
    const { data, error: err } = await (supabase as any).rpc('conversation_read_state', { p_conv: id });
    if (!err && activeRef.current === id) setReadState(data ?? []);
  }, [supabase]);

  const loadThread = useCallback(async (id: string) => {
    const msgQuery = (cols: string) => (supabase as any).from('messages').select(cols)
      .eq('conversation_id', id).order('created_at', { ascending: false }).limit(200);
    const [first, { data: mem }, hides, reacts] = await Promise.all([
      msgQuery('id, conversation_id, sender_id, content, created_at, edited_at, deleted_at, deleted_by'),
      (supabase as any).rpc('conversation_members', { p_conv: id }),
      (supabase as any).from('message_hides').select('message_id').limit(5000),
      (supabase as any).from('message_reactions').select('message_id, conversation_id, profile_id, emoji').eq('conversation_id', id).limit(5000),
    ]);
    if (activeRef.current === id) {
      setReactionsReady(!reacts.error);
      setReactions(reacts.error ? [] : (reacts.data ?? []));
    }
    let msgs = first.data;
    const ready = !first.error;
    if (!ready) msgs = (await msgQuery('id, conversation_id, sender_id, content, created_at')).data;
    setExtras(ready);
    setMessages((msgs ?? []).reverse());
    setMembers(mem ?? []);
    setHidden(new Set(((hides.data as any[]) ?? []).map((h) => h.message_id)));
    if (ready) loadReadState(id);
    await (supabase as any).rpc('mark_conversation_read', { p_conv: id });
    markMessagesRead();
    setConvs((p) => p.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setAlerts((p) => { if (!p.has(id)) return p; const n = new Map(p); n.delete(id); return n; });
  }, [supabase, loadReadState]);

  // İlk yükleme: veriler sunucudan (RPC) geldiği için effect içinde çekilir
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => {
    (supabase as any).rpc('my_read_receipts').then(({ data, error: err }: any) => { if (!err) { setReceipts(data !== false); setReceiptsReady(true); } });
  }, [supabase]);

  // Açık sohbette "okundu" işaretleri sık yenilenir (karşı taraf okuyunca ✓✓ olur)
  useEffect(() => {
    if (!activeId || !extras || !convReceipts) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadReadState(activeId); }, 15_000);
    return () => clearInterval(t);
  }, [activeId, extras, convReceipts, loadReadState]);

  // Mesajlar bölümüne girmek mesaj bildirimlerini görmek sayılır: zilden kaldırılır (sohbeti açmak gerekmez).
  // Yalnızca 'mesaj' türü silinir; diğer bildirimler zilde kalır.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase as any).from('notifications').delete()
        .eq('recipient_id', user.id).eq('kind', 'mesaj');
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    })();
  }, [supabase]);

  // Sayfa açıkken adres değişirse (ör. telefon bildirimine dokunuldu) o sohbete geç
  const paramConv = params.get('c');
  useEffect(() => {
    if (!paramConv || paramConv === activeRef.current) return;
    activeRef.current = paramConv;
    setActiveId(paramConv);
  }, [paramConv]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeId) loadThread(activeId);
  }, [activeId, loadThread]);

  // Canlı: yeni mesaj gelince açık sohbete ekle, listeyi yenile
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${meId}:${crypto.randomUUID()}`) // örneğe özgü ad: yeniden kurulumda eski kanalla çakışmasın
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new as Msg;
        if (m.conversation_id === activeRef.current) {
          setMessages((p) => (p.some((x) => x.id === m.id) ? p : [...p, m]));
          if (m.sender_id !== meId) (supabase as any).rpc('mark_conversation_read', { p_conv: m.conversation_id }).then(markMessagesRead);
        }
        loadConvs();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new as Msg;
        if (m.conversation_id === activeRef.current) setMessages((p) => p.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        loadConvs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload: any) => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Reaction;
        if (!row?.message_id || row.conversation_id !== activeRef.current) return;
        setReactions((p) => {
          const rest = p.filter((x) => !(x.message_id === row.message_id && x.profile_id === row.profile_id));
          return payload.eventType === 'DELETE' ? rest : [...rest, row];
        });
        if (payload.eventType !== 'DELETE' && row.profile_id !== meId) {
          (supabase as any).rpc('mark_conversation_read', { p_conv: row.conversation_id }).then(markMessagesRead);
        }
      })
      .subscribe();
    const timer = setInterval(() => {
      loadConvs();
      if (activeRef.current) loadThread(activeRef.current);
    }, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, [supabase, meId, loadConvs, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, activeId]);

  // Mesaja dokununca açılan seçenekler ekranın altında kalırsa sohbet hafifçe kayar ve görünür olur
  useEffect(() => {
    if (!actionFor) return;
    requestAnimationFrame(() => document.getElementById(`msg-actions-${actionFor}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }, [actionFor]);

  function openConv(id: string | null) {
    activeRef.current = id;
    setActiveId(id);
    setMenuOpen(false); setShowMembers(false); setError(null);
    setActionFor(null); setEditing(null); setReadState([]); setReactions([]); setReactPickerFor(null); setComposerEmoji(false);
    if (!id) { setMessages([]); setMembers([]); }
    const base = student ? '/ogrenci/mesajlar' : '/mesajlar';
    router.replace(id ? `${base}?c=${id}` : base, { scroll: false });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeId || sending) return;
    setSending(true); setError(null);
    if (editing) {
      const { error: err } = await (supabase as any).rpc('edit_message', { p_id: editing.id, p_content: content });
      setSending(false);
      if (err) { setError(err.message); return; }
      const now = new Date().toISOString();
      setMessages((p) => p.map((x) => (x.id === editing.id ? { ...x, content, edited_at: x.content === content ? x.edited_at : now } : x)));
      setEditing(null); setText('');
      loadConvs();
      return;
    }
    const { data: id, error: err } = await (supabase as any).rpc('send_message', { p_conv: activeId, p_content: content });
    setSending(false);
    if (err) { setError(err.message); return; }
    setText('');
    setMessages((p) => (p.some((x) => x.id === id) ? p : [...p, { id, conversation_id: activeId, sender_id: meId, content, created_at: new Date().toISOString() }]));
    loadConvs();
  }

  // Tepki: aynı emojiye tekrar dokunmak kaldırır, başkası seçilirse eskisinin yerine geçer
  async function react(m: Msg, emoji: string) {
    setActionFor(null); setReactPickerFor(null);
    const before = reactions;
    const mineNow = reactions.find((x) => x.message_id === m.id && x.profile_id === meId);
    const rest = reactions.filter((x) => !(x.message_id === m.id && x.profile_id === meId));
    setReactions(mineNow?.emoji === emoji ? rest : [...rest, { message_id: m.id, conversation_id: m.conversation_id, profile_id: meId, emoji }]);
    const { error: err } = await (supabase as any).rpc('react_message', { p_id: m.id, p_emoji: emoji });
    if (err) { setReactions(before); setError(err.message); }
  }

  // Yazı alanında imlecin olduğu yere emoji ekle
  function insertEmoji(emoji: string) {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, 2000);
    setText(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = Math.min(start + emoji.length, next.length);
      el.setSelectionRange(pos, pos);
    });
  }

  async function unsend(m: Msg) {
    setActionFor(null);
    const other = m.sender_id !== meId;
    if (!confirm(other ? 'Bu mesaj gruptan kaldırılsın mı? Herkes için silinir.' : 'Mesaj herkesten geri alınsın mı?')) return;
    const { error: err } = await (supabase as any).rpc('unsend_message', { p_id: m.id });
    if (err) { setError(err.message); return; }
    setMessages((p) => p.map((x) => (x.id === m.id ? { ...x, content: '', deleted_at: new Date().toISOString(), deleted_by: meId } : x)));
    if (editing?.id === m.id) { setEditing(null); setText(''); }
    loadConvs();
  }

  async function hideForMe(m: Msg) {
    setActionFor(null);
    const { error: err } = await (supabase as any).rpc('hide_message', { p_id: m.id });
    if (err) { setError(err.message); return; }
    setHidden((p) => new Set(p).add(m.id));
    loadConvs();
  }

  function startEdit(m: Msg) {
    setActionFor(null);
    setEditing(m);
    setText(m.content);
  }

  async function toggleReceipts() {
    setMenuOpen(false);
    const next = !receipts;
    if (!confirm(next
      ? 'Okundu bilgisi genel olarak açılsın mı? (Sohbete özel ayar yaptığın sohbetler değişmez.) Mesajları okuduğunda karşı taraf görür; sen de onların okuyup okumadığını görürsün.'
      : 'Okundu bilgisi genel olarak kapatılsın mı? (Sohbete özel ayar yaptığın sohbetler değişmez.) Mesajları okuduğunu görmezler; sen de onların okuyup okumadığını göremezsin.')) return;
    const { error: err } = await (supabase as any).rpc('set_read_receipts', { p_on: next });
    if (err) { setError(err.message); return; }
    setReceipts(next);
    await loadConvs();
    if (activeId) loadReadState(activeId);
  }

  async function toggleConvReceipts() {
    if (!active) return;
    setMenuOpen(false);
    const next = !convReceipts;
    // Genel ayarla aynıysa sohbete özel ayar kaldırılır (genel ayar değişince bu sohbet de ona uyar)
    const { error: err } = await (supabase as any).rpc('set_conversation_receipts', { p_conv: active.id, p_on: next === receipts ? null : next });
    if (err) { setError(err.message); return; }
    setConvs((p) => p.map((c) => (c.id === active.id ? { ...c, read_receipts: next, read_receipts_custom: next !== receipts } : c)));
    loadReadState(active.id);
  }

  async function setMute(hours: number | null | 'off') {
    if (!active) return;
    setMenuOpen(false); setMuteMenu(false);
    const until = hours === 'off' ? null
      : hours === null ? new Date(Date.UTC(MUTE_FOREVER_YEAR, 11, 31)).toISOString()
      : addHours(hours);
    const { error: err } = await (supabase as any).rpc('set_conversation_mute', { p_conv: active.id, p_until: until });
    if (err) { setError(err.message); return; }
    setConvs((p) => p.map((c) => (c.id === active.id ? { ...c, muted_until: until } : c)));
  }

  async function toggleBlock() {
    if (!active?.other_id) return;
    const blocked = blockedIds.has(active.other_id);
    if (!blocked && !confirm('Bu kişiyi engellemek istiyor musun? Birbirinize mesaj gönderemezsiniz.')) return;
    const { error: err } = await (supabase as any).rpc('set_block', { p_other: active.other_id, p_block: !blocked });
    setMenuOpen(false);
    if (err) { setError(err.message); return; }
    loadThread(active.id);
  }

  async function blockMember(id: string, block: boolean) {
    const { error: err } = await (supabase as any).rpc('set_block', { p_other: id, p_block: block });
    if (err) { setError(err.message); return; }
    if (activeId) loadThread(activeId);
  }

  async function removeMember(id: string) {
    if (!activeId || !confirm('Bu kişi gruptan çıkarılsın mı?')) return;
    const { error: err } = await (supabase as any).rpc('update_group', { p_conv: activeId, p_title: null, p_add: [], p_remove: [id] });
    if (err) { setError(err.message); return; }
    loadThread(activeId); loadConvs();
  }

  async function leave() {
    if (!active) return;
    const owner = active.created_by === meId;
    if (!confirm(owner ? 'Grubu silmek istiyor musunuz? Tüm mesajlar silinir.' : 'Gruptan ayrılmak istiyor musun?')) return;
    const { error: err } = await (supabase as any).rpc('leave_conversation', { p_conv: active.id });
    if (err) { setError(err.message); return; }
    openConv(null); loadConvs();
  }

  async function startDirect(contactId: string) {
    const { data, error: err } = await (supabase as any).rpc('start_direct_conversation', { p_other: contactId });
    if (err) return err.message as string;
    setPicker(null);
    await loadConvs();
    openConv(data);
    return null;
  }

  async function createGroup(title: string, ids: string[]) {
    const { data, error: err } = await (supabase as any).rpc('create_group_conversation', { p_title: title, p_members: ids });
    if (err) return err.message as string;
    setPicker(null);
    await loadConvs();
    openConv(data);
    return null;
  }

  async function addMembers(_title: string, ids: string[]) {
    if (!activeId) return null;
    const { error: err } = await (supabase as any).rpc('update_group', { p_conv: activeId, p_title: null, p_add: ids, p_remove: [] });
    if (err) return err.message as string;
    setPicker(null);
    loadThread(activeId); loadConvs();
    return null;
  }

  // ---------- görünüm ----------
  const card = student ? 'rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)]' : 'rounded-xl border border-[var(--border)] bg-[var(--card)]';
  const primaryBtn = student
    ? 'inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-[var(--accent-dark)]'
    : 'inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--accent-dark)]';
  const ghostBtn = student
    ? 'inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--border)] px-4 py-2 text-[13px] font-bold text-[var(--ink)] hover:bg-[var(--accent-soft)]'
    : 'inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--paper)]';

  if (setupError) {
    return (
      <div className={`${card} p-8 text-center text-[14px] text-[var(--ink-muted)]`}>
        Mesajlaşma henüz etkinleştirilmedi. (Yönetici: <code>supabase/messaging.sql</code> dosyasını çalıştırın.)
      </div>
    );
  }

  const filtered = convs.filter((c) => !search.trim() || (c.title ?? '').toLocaleLowerCase('tr').includes(search.trim().toLocaleLowerCase('tr')));
  const isOwner = active?.kind === 'group' && active.created_by === meId;
  const visibleMessages = messages.filter((m) => !hidden.has(m.id));
  // Kendi mesajım okundu mu? Okundu bilgisi kapalı olanlar (read_at boş) hesaba katılmaz.
  function readInfo(m: Msg): { all: boolean; names: string } | null {
    if (!extras || !convReceipts || readState.length === 0) return { all: false, names: '' };
    const t = new Date(m.created_at).getTime();
    const known = readState.filter((r) => r.read_at);
    const readers = known.filter((r) => new Date(r.read_at!).getTime() >= t);
    const names = active?.kind === 'group' ? readers.map((r) => memberMap.get(r.profile_id)?.full_name ?? '').filter(Boolean).join(', ') : '';
    return { all: known.length > 0 && readers.length === known.length && known.length === readState.length, names };
  }
  const otherBlocked = !!active?.other_id && blockedIds.has(active.other_id);
  // Mesajdaki tepkiler: emojiye göre gruplanır, ilk bırakılan önce
  function reactionGroups(id: string) {
    const groups: { emoji: string; count: number; mine: boolean; names: string[] }[] = [];
    for (const x of reactions) {
      if (x.message_id !== id) continue;
      let g = groups.find((y) => y.emoji === x.emoji);
      if (!g) { g = { emoji: x.emoji, count: 0, mine: false, names: [] }; groups.push(g); }
      g.count += 1;
      if (x.profile_id === meId) g.mine = true;
      g.names.push(x.profile_id === meId ? 'Sen' : memberMap.get(x.profile_id)?.full_name ?? active?.title ?? '');
    }
    return groups;
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[420px] gap-4 md:h-[calc(100vh-9rem)]">
      {/* Sohbet listesi */}
      <div className={`${card} ${activeId ? 'hidden md:flex' : 'flex'} w-full flex-col overflow-hidden md:w-80 md:flex-shrink-0`}>
        <div className="space-y-2.5 border-b border-[var(--border)] p-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h1 className={`flex-shrink-0 text-[18px] text-[var(--ink)] ${student ? 'font-extrabold' : 'font-medium'}`}>{student ? '💬 Mesajlar' : 'Mesajlar'}</h1>
            <div className="flex flex-shrink-0 gap-1.5">
              {isStaff && (
                <button type="button" onClick={() => setBulkOpen(true)} className={ghostBtn} title="Grup kurmadan, seçtiğiniz öğrencilerin her birine ayrı mesaj">
                  <IconSpeakerphone size={15} /> <span className="hidden sm:inline md:hidden">Toplu</span>
                </button>
              )}
              {isStaff && (
                <button type="button" onClick={() => setPicker('group')} className={ghostBtn} title="Yeni grup">
                  <IconUsersGroup size={15} /> <span className="hidden sm:inline md:hidden">Grup</span>
                </button>
              )}
              <button type="button" onClick={() => setPicker('direct')} className={primaryBtn}>
                <IconPlus size={15} /> Yeni
              </button>
            </div>
          </div>
          <div className="relative">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sohbet ara"
              className={`w-full border border-[var(--border)] bg-[var(--paper)] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[var(--accent)] ${student ? 'rounded-full' : 'rounded-lg'}`} />
          </div>
          {receiptsReady && (
            <button type="button" onClick={toggleReceipts} title="Sohbete özel ayar yapmadığın tüm sohbetler için geçerlidir"
              className="flex items-center gap-1.5 text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink)]">
              {receipts ? <IconEye size={14} /> : <IconEyeOff size={14} />}
              Okundu bilgisi (genel): <b className={receipts ? 'text-[var(--accent-dark)]' : ''}>{receipts ? 'Açık' : 'Kapalı'}</b>
              <span className="underline">{receipts ? 'kapat' : 'aç'}</span>
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {!loaded ? (
            <p className="p-6 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor…</p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              {student && <div className="mb-2 text-[36px]">💬</div>}
              <p className="text-[13px] text-[var(--ink-muted)]">
                {convs.length === 0 ? (student ? 'Henüz mesajın yok. Koçuna yazmak için "Yeni"ye dokun.' : 'Henüz sohbet yok. "Yeni" ile başlayın.') : 'Sonuç yok.'}
              </p>
            </div>
          ) : filtered.map((c) => (
            <button key={c.id} type="button" onClick={() => openConv(c.id)}
              className={`flex w-full items-center gap-3 border-b border-[var(--border)] px-3 py-3 text-left transition-colors last:border-b-0 ${c.id === activeId ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--paper)]'}`}>
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${c.kind === 'group' ? 'bg-[var(--sky-soft,#E3F2FE)] text-[#1F78BD]' : 'bg-[var(--accent-soft)] text-[var(--accent-dark)]'}`}>
                {c.kind === 'group' ? <IconUsersGroup size={18} /> : initials(c.title)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-[14px] text-[var(--ink)] ${c.unread ? 'font-bold' : 'font-medium'}`}>{c.title ?? 'Sohbet'}</span>
                  <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-[var(--ink-muted)]">
                    {c.muted_until && <IconBellOff size={13} aria-label="Sessizde" />}{shortTime(c.last_at)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  {(() => {
                    const al = !c.unread && c.id !== activeId ? alerts.get(c.id) : undefined;
                    return al ? (
                      <span className="truncate text-[12.5px] font-semibold text-[var(--ink)]">
                        {c.kind === 'group' && al.last_by ? `${al.last_by.split(' ')[0]} ` : ''}mesajına {al.last_emoji} bıraktı
                      </span>
                    ) : (
                      <span className={`truncate text-[12.5px] ${c.unread ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>
                        {c.last_message ? `${c.last_sender === meId ? 'Sen: ' : ''}${c.last_message}` : c.kind === 'group' ? `${c.member_count} üye` : 'Yeni sohbet'}
                      </span>
                    );
                  })()}
                  <span className="flex flex-shrink-0 items-center gap-1">
                    {c.id !== activeId && (alerts.get(c.id)?.cnt ?? 0) > 0 && (
                      <span title="Mesajlarına yeni tepki" aria-label={`${alerts.get(c.id)!.cnt} yeni tepki`}
                        className="flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                        <IconMoodSmile size={12} strokeWidth={2.5} />{alerts.get(c.id)!.cnt}
                      </span>
                    )}
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-white">{c.unread}</span>
                    )}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sohbet */}
      <div className={`${card} ${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col overflow-hidden`}>
        {!active ? (
          activeId && !loaded ? (
            // Bildirimden ya da bağlantıdan doğrudan bir sohbete gelindi: liste yüklenirken "sohbet seç" yazısı görünmesin
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[var(--ink-muted)]">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--accent-soft)] border-t-[var(--accent)]" />
              <p className="text-[14px]">Sohbet açılıyor…</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--ink-muted)]">
              {student && <div className="mb-2 text-[44px]">💌</div>}
              <p className="text-[14px]">{activeId ? 'Sohbet bulunamadı.' : 'Soldan bir sohbet seç.'}</p>
            </div>
          )
        ) : (
          <>
            <div className="relative flex items-center gap-3 border-b border-[var(--border)] px-3 py-2.5">
              <button type="button" onClick={() => openConv(null)} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)] md:hidden" aria-label="Geri">
                <IconArrowLeft size={19} />
              </button>
              <button type="button" onClick={() => active.kind === 'group' && setShowMembers((v) => !v)} className="min-w-0 flex-1 text-left">
                <span className={`block truncate text-[15px] text-[var(--ink)] ${student ? 'font-extrabold' : 'font-semibold'}`}>{active.title}</span>
                <span className="block text-[12px] text-[var(--ink-muted)]">
                  {active.kind === 'group' ? `${members.length || active.member_count} üye · üyeleri gör` : ROLE_LABEL[active.other_role ?? ''] ?? ''}
                  {active.muted_until ? ` · sessizde, ${muteText(active.muted_until)}` : ''}
                </span>
              </button>
              <button type="button" onClick={() => { setMenuOpen((v) => !v); setMuteMenu(false); }} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)]" aria-label="Seçenekler">
                <IconDotsVertical size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-3 top-12 z-20 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-xl">
                  {perConv && (
                    <>
                      <button type="button" onClick={toggleConvReceipts} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]">
                        {convReceipts ? <IconEyeOff size={15} /> : <IconEye size={15} />}
                        <span>Okundu bilgisi: <b>{convReceipts ? 'Açık' : 'Kapalı'}</b>
                          <span className="block text-[11px] text-[var(--ink-muted)]">yalnızca bu sohbet{active.read_receipts_custom ? ' · genel ayardan farklı' : ''} · {convReceipts ? 'kapat' : 'aç'}</span>
                        </span>
                      </button>
                      {active.muted_until ? (
                        <button type="button" onClick={() => setMute('off')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]">
                          <IconBell size={15} /> <span>Sessizden çıkar<span className="block text-[11px] text-[var(--ink-muted)]">Sessiz: {muteText(active.muted_until)}</span></span>
                        </button>
                      ) : (
                        <button type="button" onClick={() => setMuteMenu((v) => !v)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]">
                          <IconBellOff size={15} /> Sessize al
                        </button>
                      )}
                      {muteMenu && !active.muted_until && (
                        <div className="flex flex-wrap gap-1 px-3 pb-2">
                          {MUTE_OPTIONS.map((o) => (
                            <button key={o.label} type="button" onClick={() => setMute(o.hours)}
                              className="rounded-full bg-[var(--paper)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ink)] ring-1 ring-[var(--border)] hover:bg-[var(--accent-soft)]">{o.label}</button>
                          ))}
                          <p className="w-full pt-1 text-[11px] text-[var(--ink-muted)]">Bu sohbetten bildirim gelmez; mesajlar yine görünür.</p>
                        </div>
                      )}
                      <div className="my-1 border-t border-[var(--border)]" />
                    </>
                  )}
                  {active.kind === 'direct' ? (
                    <button type="button" onClick={toggleBlock} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--danger)] hover:bg-[var(--danger-soft)]">
                      <IconBan size={15} /> {otherBlocked ? 'Engeli kaldır' : 'Engelle'}
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setShowMembers(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]">
                        <IconUsersGroup size={15} /> Üyeler
                      </button>
                      {isOwner && (
                        <button type="button" onClick={() => { setPicker('add'); setMenuOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--ink)] hover:bg-[var(--paper)]">
                          <IconPlus size={15} /> Üye ekle
                        </button>
                      )}
                      <button type="button" onClick={leave} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--danger)] hover:bg-[var(--danger-soft)]">
                        <IconX size={15} /> {isOwner ? 'Grubu sil' : 'Gruptan ayrıl'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {showMembers && active.kind === 'group' && (
              <div className="max-h-56 overflow-y-auto border-b border-[var(--border)] bg-[var(--paper)] px-3 py-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
                    <span className="min-w-0 truncate text-[var(--ink)]">
                      {m.full_name}{m.id === meId && ' (sen)'} <span className="text-[11.5px] text-[var(--ink-muted)]">· {ROLE_LABEL[m.role] ?? m.role}{m.id === active.created_by ? ' · yönetici' : ''}</span>
                    </span>
                    {m.id !== meId && (
                      <span className="flex flex-shrink-0 gap-2 text-[12px]">
                        <button type="button" onClick={() => blockMember(m.id, !m.blocked)} className="text-[var(--ink-muted)] hover:text-[var(--danger)]">
                          {m.blocked ? 'Engeli kaldır' : 'Engelle'}
                        </button>
                        {isOwner && <button type="button" onClick={() => removeMember(m.id)} className="text-[var(--danger)] hover:underline">Çıkar</button>}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 space-y-1.5 overflow-y-auto bg-[var(--paper)] px-3 py-4">
              {visibleMessages.length === 0 && (
                <p className="py-10 text-center text-[13px] text-[var(--ink-muted)]">{student ? 'İlk mesajı sen yaz! 👋' : 'Henüz mesaj yok.'}</p>
              )}
              {visibleMessages.map((m, i) => {
                const mine = m.sender_id === meId;
                const prev = visibleMessages[i - 1];
                const showName = active.kind === 'group' && !mine && prev?.sender_id !== m.sender_id;
                if (!mine && blockedIds.has(m.sender_id)) {
                  return <p key={m.id} className="text-center text-[11.5px] italic text-[var(--ink-muted)]">Engellediğin kişinin mesajı gizlendi</p>;
                }
                const deleted = !!m.deleted_at;
                const open = actionFor === m.id;
                const canEdit = open && mine && !deleted && actionAt - new Date(m.created_at).getTime() < EDIT_WINDOW_MS;
                const canUnsend = open && !deleted && (canEdit || isOwner);
                const read = mine && !deleted ? readInfo(m) : null;
                const msgReactions = reactionGroups(m.id);
                const myReaction = reactions.find((x) => x.message_id === m.id && x.profile_id === meId)?.emoji;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <button type="button" disabled={!extras && !reactionsReady} onClick={() => { setActionAt(Date.now()); setReactPickerFor(null); setActionFor(open ? null : m.id); }}
                      className={`max-w-[80%] px-3.5 py-2 text-left text-[14px] leading-snug shadow-sm ${open ? 'ring-2 ring-[var(--accent-dark)]/40' : ''} ${
                      mine
                        ? `${student ? 'rounded-[20px] rounded-br-md' : 'rounded-2xl rounded-br-sm'} ${deleted ? 'bg-[var(--accent)]/60' : 'bg-[var(--accent)]'} text-white`
                        : `${student ? 'rounded-[20px] rounded-bl-md' : 'rounded-2xl rounded-bl-sm'} bg-[var(--card)] text-[var(--ink)]`}`}>
                      {showName && <span className="mb-0.5 block text-[11.5px] font-bold text-[var(--accent-dark)]">{memberMap.get(m.sender_id)?.full_name ?? 'Eski üye'}</span>}
                      {deleted
                        ? <span className="italic opacity-80">{m.deleted_by && m.deleted_by !== m.sender_id ? 'Bu mesaj grup yöneticisi tarafından kaldırıldı' : 'Bu mesaj geri alındı'}</span>
                        : <span className="whitespace-pre-wrap break-words">{m.content}</span>}
                      <span className={`mt-0.5 flex items-center justify-end gap-1 text-[10.5px] ${mine ? 'text-white/75' : 'text-[var(--ink-muted)]'}`}>
                        {m.edited_at && !deleted && <span className="italic">düzenlendi ·</span>}
                        {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        {read && (read.all
                          ? <span title={read.names ? `Okuyanlar: ${read.names}` : 'Okundu'} className="text-white"><IconChecks size={15} strokeWidth={2.5} /></span>
                          : <span title={read.names ? `Okuyanlar: ${read.names}` : 'Gönderildi'}><IconCheck size={14} /></span>)}
                      </span>
                    </button>
                    {msgReactions.length > 0 && !deleted && (
                      <div className={`-mt-1.5 flex max-w-[80%] flex-wrap gap-1 ${mine ? 'justify-end pr-2' : 'pl-2'}`}>
                        {msgReactions.map((g) => (
                          <button key={g.emoji} type="button" onClick={() => react(m, g.emoji)}
                            title={g.names.join(', ')}
                            className={`flex items-center gap-1 rounded-full border px-1.5 py-px text-[13px] leading-5 shadow-sm transition-colors ${
                              g.mine ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--paper)]'}`}>
                            <span>{g.emoji}</span>
                            {g.count > 1 && <span className="text-[11px] font-semibold text-[var(--ink-muted)]">{g.count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {open && reactionsReady && !deleted && (
                      <div className="relative mt-1 flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 shadow-md">
                        {QUICK_REACTIONS.map((e) => (
                          <button key={e} type="button" onClick={() => react(m, e)} aria-label={`${e} tepkisi`}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-[19px] transition-transform hover:scale-125 ${myReaction === e ? 'bg-[var(--accent-soft)]' : ''}`}>
                            {e}
                          </button>
                        ))}
                        <button type="button" onClick={() => setReactPickerFor(reactPickerFor === m.id ? null : m.id)} aria-label="Başka emoji"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-muted)] hover:bg-[var(--paper)]">
                          <IconPlus size={16} />
                        </button>
                        {reactPickerFor === m.id && (
                          <div className={`absolute top-full z-30 mt-1 ${mine ? 'right-0' : 'left-0'}`}>
                            <EmojiPicker onPick={(e) => react(m, e)} />
                          </div>
                        )}
                      </div>
                    )}
                    {open && extras && (
                      <div id={`msg-actions-${m.id}`} className="mt-1 flex scroll-mb-3 flex-wrap gap-1 text-[12px]">
                        {canEdit && <button type="button" onClick={() => startEdit(m)} className="flex items-center gap-1 rounded-full bg-[var(--card)] px-2.5 py-1 font-semibold text-[var(--ink)] shadow-sm"><IconPencil size={13} /> Düzenle</button>}
                        {canUnsend && <button type="button" onClick={() => unsend(m)} className="flex items-center gap-1 rounded-full bg-[var(--card)] px-2.5 py-1 font-semibold text-[var(--danger)] shadow-sm"><IconArrowBackUp size={13} /> {mine ? 'Herkesten geri al' : 'Gruptan kaldır'}</button>}
                        {!deleted && <button type="button" onClick={() => { navigator.clipboard?.writeText(m.content); setActionFor(null); }} className="flex items-center gap-1 rounded-full bg-[var(--card)] px-2.5 py-1 font-semibold text-[var(--ink)] shadow-sm"><IconCopy size={13} /> Kopyala</button>}
                        <button type="button" onClick={() => hideForMe(m)} className="flex items-center gap-1 rounded-full bg-[var(--card)] px-2.5 py-1 font-semibold text-[var(--ink-muted)] shadow-sm"><IconTrash size={13} /> Benden sil</button>
                        {mine && read?.names && <span className="self-center px-1 text-[11.5px] text-[var(--ink-muted)]">Okuyanlar: {read.names}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && <p className="border-t border-[var(--border)] bg-[var(--danger-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}

            {otherBlocked ? (
              <p className="border-t border-[var(--border)] px-4 py-3 text-center text-[13px] text-[var(--ink-muted)]">Bu kişiyi engelledin. Mesaj göndermek için engeli kaldır.</p>
            ) : (
              <>
              {editing && (
                <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1.5 text-[12.5px] text-[var(--accent-dark)]">
                  <IconPencil size={14} /> <span className="min-w-0 flex-1 truncate">Mesajı düzenliyorsun: <i>{editing.content}</i></span>
                  <button type="button" onClick={() => { setEditing(null); setText(''); }} aria-label="Düzenlemeyi bırak"><IconX size={15} /></button>
                </div>
              )}
              <form onSubmit={send} className="relative flex items-end gap-2 border-t border-[var(--border)] p-2.5">
                {composerEmoji && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setComposerEmoji(false)} />
                    <div className="absolute bottom-full left-2.5 z-30 mb-2">
                      <EmojiPicker onPick={insertEmoji} />
                    </div>
                  </>
                )}
                <button type="button" onClick={() => setComposerEmoji((v) => !v)} aria-label="Emoji ekle" title="Emoji ekle"
                  className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full transition-colors ${composerEmoji ? 'bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'text-[var(--ink-muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]'}`}>
                  <IconMoodSmile size={22} />
                </button>
                <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
                  placeholder={student ? 'Mesajını yaz… 😊' : 'Mesaj yazın…'}
                  className={`max-h-32 min-h-[42px] flex-1 resize-none border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--accent)] ${student ? 'rounded-[20px]' : 'rounded-xl'}`} />
                <button type="submit" disabled={sending || !text.trim()} aria-label="Gönder"
                  className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-40">
                  {editing ? <IconCheck size={18} /> : <IconSend size={18} />}
                </button>
              </form>
              </>
            )}
          </>
        )}
      </div>

      {bulkOpen && <BulkMessage supabase={supabase} onClose={() => setBulkOpen(false)} onSent={loadConvs} />}

      {picker && (
        <ContactPicker
          supabase={supabase}
          mode={picker}
          student={student}
          excludeIds={picker === 'add' ? members.map((m) => m.id) : []}
          onClose={() => setPicker(null)}
          onDirect={startDirect}
          onGroup={picker === 'add' ? addMembers : createGroup}
        />
      )}
    </div>
  );
}

function ContactPicker({ supabase, mode, student, excludeIds, onClose, onDirect, onGroup }: {
  supabase: any; mode: 'direct' | 'group' | 'add'; student: boolean; excludeIds: string[];
  onClose: () => void;
  onDirect: (id: string) => Promise<string | null>;
  onGroup: (title: string, ids: string[]) => Promise<string | null>;
}) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [q, setQ] = useState('');
  const [kurum, setKurum] = useState('');
  const [sinif, setSinif] = useState('');
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const multi = mode !== 'direct';

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.rpc('message_contacts');
      if (err) setError(err.message);
      setContacts(data ?? []);
    })();
  }, [supabase]);

  const kurumlar = useMemo(() => Array.from(new Set((contacts ?? []).map((c) => c.kurum).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'tr')), [contacts]);
  const siniflar = useMemo(() => Array.from(new Set((contacts ?? []).filter((c) => !kurum || c.kurum === kurum).map((c) => c.sinif).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'tr')), [contacts, kurum]);

  const list = (contacts ?? []).filter((c) => {
    if (excludeIds.includes(c.id)) return false;
    if (kurum && c.kurum !== kurum) return false;
    if (sinif && c.sinif !== sinif) return false;
    return !q.trim() || c.full_name.toLocaleLowerCase('tr').includes(q.trim().toLocaleLowerCase('tr'));
  });
  const allSelected = list.length > 0 && list.every((c) => selected.has(c.id));

  function toggle(id: string) {
    setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((p) => {
      const n = new Set(p);
      if (allSelected) list.forEach((c) => n.delete(c.id)); else list.forEach((c) => n.add(c.id));
      return n;
    });
  }

  async function pick(id: string) {
    setBusy(true); setError(null);
    const err = await onDirect(id);
    setBusy(false);
    if (err) setError(err);
  }

  async function submitGroup() {
    if (mode === 'group' && !title.trim()) { setError('Grup adı yazın.'); return; }
    if (selected.size === 0) { setError('En az bir kişi seçin.'); return; }
    setBusy(true); setError(null);
    const err = await onGroup(title.trim(), Array.from(selected));
    setBusy(false);
    if (err) setError(err);
  }

  const field = `w-full border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] ${student ? 'rounded-2xl' : 'rounded-lg'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden bg-[var(--card)] shadow-2xl ${student ? 'rounded-t-[28px] sm:rounded-[28px]' : 'rounded-t-2xl sm:rounded-2xl'}`}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-[16px] font-semibold text-[var(--ink)]">{mode === 'direct' ? 'Yeni mesaj' : mode === 'group' ? 'Yeni grup' : 'Üye ekle'}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)]"><IconX size={18} /></button>
        </div>

        <div className="space-y-2 border-b border-[var(--border)] p-3">
          {mode === 'group' && <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Grup adı (örn. 12-A Matematik)" className={field} autoFocus />}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim ara" className={field} autoFocus={mode !== 'group'} />
          {kurumlar.length > 0 && (
            <div className="flex gap-2">
              <select value={kurum} onChange={(e) => { setKurum(e.target.value); setSinif(''); }} className={field}>
                <option value="">Tüm kurumlar</option>
                {kurumlar.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              {siniflar.length > 0 && (
                <select value={sinif} onChange={(e) => setSinif(e.target.value)} className={field}>
                  <option value="">Tüm sınıflar</option>
                  {siniflar.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              )}
            </div>
          )}
          {multi && list.length > 0 && (
            <button type="button" onClick={toggleAll} className="text-[12.5px] font-semibold text-[var(--accent-dark)] hover:underline">
              {allSelected ? 'Seçimi kaldır' : `Listelenen ${list.length} kişinin hepsini seç`}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts === null ? (
            <p className="p-6 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor…</p>
          ) : list.length === 0 ? (
            <p className="p-6 text-center text-[13px] text-[var(--ink-muted)]">{contacts.length === 0 ? 'Mesaj gönderebileceğin kimse bulunamadı.' : 'Sonuç yok.'}</p>
          ) : list.map((c) => {
            const on = selected.has(c.id);
            return (
              <button key={c.id} type="button" disabled={busy} onClick={() => (multi ? toggle(c.id) : pick(c.id))}
                className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-left last:border-b-0 hover:bg-[var(--paper)]">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] font-bold text-[var(--accent-dark)]">{initials(c.full_name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--ink)]">{c.full_name}</span>
                  <span className="block truncate text-[12px] text-[var(--ink-muted)]">
                    {[ROLE_LABEL[c.role] ?? c.role, c.kurum, c.sinif].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {multi && (
                  <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)]'}`}>
                    {on && <IconCheck size={13} strokeWidth={3} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="bg-[var(--danger-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}
        {multi && (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] p-3">
            <span className="text-[13px] text-[var(--ink-muted)]">{selected.size} kişi seçildi</span>
            <button type="button" disabled={busy} onClick={submitGroup}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
              {mode === 'group' ? 'Grubu kur' : 'Ekle'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
