'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IconArrowLeft, IconSend, IconPlus, IconUsersGroup, IconSearch, IconDotsVertical, IconBan, IconX, IconCheck,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

type Conv = {
  id: string; kind: 'direct' | 'group'; title: string | null; other_id: string | null; other_role: string | null;
  member_count: number; created_by: string | null; last_message: string | null; last_sender: string | null;
  last_at: string; unread: number;
};
type Msg = { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };
type Member = { id: string; full_name: string; role: string; blocked: boolean };
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(activeId); // canlı abonelik açık sohbeti buradan okur

  const active = convs.find((c) => c.id === activeId) ?? null;
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const blockedIds = useMemo(() => new Set(members.filter((m) => m.blocked).map((m) => m.id)), [members]);

  const loadConvs = useCallback(async () => {
    const { data, error: err } = await (supabase as any).rpc('my_conversations');
    if (err) { if (missingSetup(err)) setSetupError(true); setLoaded(true); return; }
    setConvs(data ?? []);
    setLoaded(true);
  }, [supabase]);

  const loadThread = useCallback(async (id: string) => {
    const [{ data: msgs }, { data: mem }] = await Promise.all([
      (supabase as any).from('messages').select('id, conversation_id, sender_id, content, created_at')
        .eq('conversation_id', id).order('created_at', { ascending: false }).limit(200),
      (supabase as any).rpc('conversation_members', { p_conv: id }),
    ]);
    setMessages((msgs ?? []).reverse());
    setMembers(mem ?? []);
    await (supabase as any).rpc('mark_conversation_read', { p_conv: id });
    setConvs((p) => p.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }, [supabase]);

  // İlk yükleme: veriler sunucudan (RPC) geldiği için effect içinde çekilir
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadConvs(); }, [loadConvs]);

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
          if (m.sender_id !== meId) (supabase as any).rpc('mark_conversation_read', { p_conv: m.conversation_id });
        }
        loadConvs();
      })
      .subscribe();
    const timer = setInterval(() => {
      loadConvs();
      if (activeRef.current) loadThread(activeRef.current);
    }, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, [supabase, meId, loadConvs, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, activeId]);

  function openConv(id: string | null) {
    activeRef.current = id;
    setActiveId(id);
    setMenuOpen(false); setShowMembers(false); setError(null);
    if (!id) { setMessages([]); setMembers([]); }
    const base = student ? '/ogrenci/mesajlar' : '/mesajlar';
    router.replace(id ? `${base}?c=${id}` : base, { scroll: false });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeId || sending) return;
    setSending(true); setError(null);
    const { data: id, error: err } = await (supabase as any).rpc('send_message', { p_conv: activeId, p_content: content });
    setSending(false);
    if (err) { setError(err.message); return; }
    setText('');
    setMessages((p) => (p.some((x) => x.id === id) ? p : [...p, { id, conversation_id: activeId, sender_id: meId, content, created_at: new Date().toISOString() }]));
    loadConvs();
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
  const otherBlocked = !!active?.other_id && blockedIds.has(active.other_id);

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[420px] gap-4 md:h-[calc(100vh-9rem)]">
      {/* Sohbet listesi */}
      <div className={`${card} ${activeId ? 'hidden md:flex' : 'flex'} w-full flex-col overflow-hidden md:w-80 md:flex-shrink-0`}>
        <div className="space-y-2.5 border-b border-[var(--border)] p-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className={`text-[18px] text-[var(--ink)] ${student ? 'font-extrabold' : 'font-medium'}`}>{student ? '💬 Mesajlar' : 'Mesajlar'}</h1>
            <div className="flex gap-1.5">
              {isStaff && (
                <button type="button" onClick={() => setPicker('group')} className={ghostBtn} title="Yeni grup">
                  <IconUsersGroup size={15} /> <span className="hidden sm:inline">Grup</span>
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
        </div>
        <div className="flex-1 overflow-y-auto">
          {!loaded ? (
            <p className="p-6 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor…</p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mb-2 text-[36px]">💬</div>
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
                  <span className="flex-shrink-0 text-[11px] text-[var(--ink-muted)]">{shortTime(c.last_at)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-[12.5px] ${c.unread ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>
                    {c.last_message ? `${c.last_sender === meId ? 'Sen: ' : ''}${c.last_message}` : c.kind === 'group' ? `${c.member_count} üye` : 'Yeni sohbet'}
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-white">{c.unread}</span>
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sohbet */}
      <div className={`${card} ${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col overflow-hidden`}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--ink-muted)]">
            <div className="mb-2 text-[44px]">💌</div>
            <p className="text-[14px]">{activeId && loaded ? 'Sohbet bulunamadı.' : 'Soldan bir sohbet seç.'}</p>
          </div>
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
                </span>
              </button>
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)]" aria-label="Seçenekler">
                <IconDotsVertical size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-3 top-12 z-20 w-52 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-xl">
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
              {messages.length === 0 && (
                <p className="py-10 text-center text-[13px] text-[var(--ink-muted)]">{student ? 'İlk mesajı sen yaz! 👋' : 'Henüz mesaj yok.'}</p>
              )}
              {messages.map((m, i) => {
                const mine = m.sender_id === meId;
                const prev = messages[i - 1];
                const showName = active.kind === 'group' && !mine && prev?.sender_id !== m.sender_id;
                if (!mine && blockedIds.has(m.sender_id)) {
                  return <p key={m.id} className="text-center text-[11.5px] italic text-[var(--ink-muted)]">Engellediğin kişinin mesajı gizlendi</p>;
                }
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3.5 py-2 text-[14px] leading-snug shadow-sm ${
                      mine
                        ? `${student ? 'rounded-[20px] rounded-br-md' : 'rounded-2xl rounded-br-sm'} bg-[var(--accent)] text-white`
                        : `${student ? 'rounded-[20px] rounded-bl-md' : 'rounded-2xl rounded-bl-sm'} bg-[var(--card)] text-[var(--ink)]`}`}>
                      {showName && <span className="mb-0.5 block text-[11.5px] font-bold text-[var(--accent-dark)]">{memberMap.get(m.sender_id)?.full_name ?? 'Eski üye'}</span>}
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                      <span className={`mt-0.5 block text-right text-[10.5px] ${mine ? 'text-white/75' : 'text-[var(--ink-muted)]'}`}>
                        {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {error && <p className="border-t border-[var(--border)] bg-[var(--danger-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}

            {otherBlocked ? (
              <p className="border-t border-[var(--border)] px-4 py-3 text-center text-[13px] text-[var(--ink-muted)]">Bu kişiyi engelledin. Mesaj göndermek için engeli kaldır.</p>
            ) : (
              <form onSubmit={send} className="flex items-end gap-2 border-t border-[var(--border)] p-2.5">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
                  placeholder={student ? 'Mesajını yaz… 😊' : 'Mesaj yazın…'}
                  className={`max-h-32 min-h-[42px] flex-1 resize-none border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--accent)] ${student ? 'rounded-[20px]' : 'rounded-xl'}`} />
                <button type="submit" disabled={sending || !text.trim()} aria-label="Gönder"
                  className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-40">
                  <IconSend size={18} />
                </button>
              </form>
            )}
          </>
        )}
      </div>

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
