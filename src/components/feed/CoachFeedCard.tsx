'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconBrandYoutube, IconPin, IconBulb, IconSend, IconTrash, IconSearch, IconUsers, IconCheck, IconExternalLink, IconSparkles, IconChevronDown, IconPlayerStop, IconPlayerPlay, IconCalendar,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { parseEmbed } from '@/lib/embed';
import { feedIdeas } from '@/lib/feed-ideas';
import { EmbedView } from './EmbedView';

// Koç ana sayfası: öğrencilerin ana sayfasına içerik (video/gönderi bağlantısı) ve pano duyurusu gönderme,
// öneriler (yönetici önerileri, diğer koçların paylaştıkları, duruma göre konu fikirleri) ve yönetici için "Koçlara öner".
// Veritabanı: supabase/home_feed.sql

type Tab = 'icerik' | 'pano' | 'koclar';
type Post = { id: string; kind: 'icerik' | 'duyuru'; audience: 'ogrenciler' | 'koclar'; url: string | null; title: string | null; body: string | null; all_students: boolean; source_post_id: string | null; created_at: string; author_id: string; starts_at?: string; ends_at?: string | null };
type FeedStudent = { id: string; full_name: string; sinif_sube: string | null; has_account: boolean; kurum?: string | null };
type ClassGroup = { kurum: string; classes: { name: string; ids: string[] }[] };

/** Öğrencileri kurum → sınıf/şube olarak gruplar (sınıfı girilmemiş öğrenciler gruba girmez) */
function groupClasses(list: FeedStudent[]): ClassGroup[] {
  const byKurum = new Map<string, Map<string, string[]>>();
  for (const s of list) {
    const cls = s.sinif_sube?.trim();
    if (!cls) continue;
    const k = s.kurum?.trim() || 'Kurum belirtilmemiş';
    if (!byKurum.has(k)) byKurum.set(k, new Map());
    const m = byKurum.get(k)!;
    m.set(cls, [...(m.get(cls) ?? []), s.id]);
  }
  return Array.from(byKurum, ([kurum, m]) => ({
    kurum,
    classes: Array.from(m, ([name, ids]) => ({ name, ids })).sort((a, b) => a.name.localeCompare(b.name, 'tr', { numeric: true })),
  })).sort((a, b) => a.kurum.localeCompare(b.kurum, 'tr'));
}
type Suggestion = { url: string; title: string | null; share_count: number };

const fmt = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

// Yayın süresi (supabase/feed_schedule.sql): başlangıç boşsa hemen, bitiş boşsa süresiz
type Dur = 'suresiz' | 'bugun' | 'hafta' | 'ay' | 'ozel';
const DURS: { key: Dur; label: string }[] = [
  { key: 'suresiz', label: 'Süresiz' }, { key: 'bugun', label: 'Bugün' }, { key: 'hafta', label: '1 hafta' },
  { key: 'ay', label: '1 ay' }, { key: 'ozel', label: 'Tarih seç' },
];
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => localDate(new Date());

function computeWindow(dur: Dur, start: string, end: string): { starts: string | null; ends: string | null; error?: string } {
  const now = new Date();
  if (dur === 'suresiz') return { starts: null, ends: null };
  if (dur === 'bugun') return { starts: null, ends: new Date(`${todayStr()}T23:59:59`).toISOString() };
  if (dur === 'hafta' || dur === 'ay') {
    const e = new Date(now); e.setDate(e.getDate() + (dur === 'hafta' ? 7 : 30));
    return { starts: null, ends: new Date(`${localDate(e)}T23:59:59`).toISOString() };
  }
  const s = start && start > todayStr() ? new Date(`${start}T00:00:00`) : null;
  const e = end ? new Date(`${end}T23:59:59`) : null;
  if (e && e <= (s ?? now)) return { starts: null, ends: null, error: 'Bitiş tarihi başlangıçtan sonra olmalı.' };
  return { starts: s?.toISOString() ?? null, ends: e?.toISOString() ?? null };
}

const startOf = (p: Post) => Date.parse(p.starts_at ?? p.created_at);

/** Paylaşımın şu anki durumu; live = öğrencide görünüyor ya da görünecek */
function statusOf(p: Post, all: Post[]): { label: string; tone: 'green' | 'blue' | 'gray'; live: boolean } {
  const now = Date.now();
  const s = startOf(p);
  if (p.ends_at && Date.parse(p.ends_at) <= now) return { label: 'Yayında değil', tone: 'gray', live: false };
  if (s > now) return { label: `${fmt(new Date(s).toISOString())} tarihinde başlar`, tone: 'blue', live: true };
  // İçerik: tüm öğrencilere giden daha yeni bir içerik yayına girdiyse bu onun yerini almıştır
  if (p.kind === 'icerik' && p.audience === 'ogrenciler' && all.some((o) => o.id !== p.id && o.kind === 'icerik'
    && o.audience === 'ogrenciler' && o.all_students && startOf(o) <= now && startOf(o) > s)) {
    return { label: 'Yenisiyle değişti', tone: 'gray', live: false };
  }
  return { label: p.ends_at ? `Yayında · ${fmt(p.ends_at)} tarihine kadar` : 'Yayında · süresiz', tone: 'green', live: true };
}

/** Şu an yayında olan (yöneticinin önerileri için) */
const isActive = (p: Post) => statusOf(p, []).live && startOf(p) <= Date.now();

export function CoachFeedCard({ isAdmin, inactive, pendingExams, total, today }: {
  isAdmin: boolean; inactive: number; pendingExams: number; total: number; today: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>('icerik');
  const [posts, setPosts] = useState<Post[]>([]);
  const [recs, setRecs] = useState<Post[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [setupMissing, setSetupMissing] = useState(false);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'all' | 'selected'>('all');
  const [students, setStudents] = useState<FeedStudent[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [dur, setDur] = useState<Dur>('suresiz');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Haftada bir kullanılır: kart kapalı başlar, başlığa dokununca açılır
  const [expanded, setExpanded] = useState(false);

  const ideas = useMemo(() => feedIdeas({ inactive, pendingExams, total, today }), [inactive, pendingExams, total, today]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [mine, rec, sug] = await Promise.all([
      (supabase as any).from('feed_posts').select('*').eq('author_id', user.id).order('created_at', { ascending: false }).limit(50),
      (supabase as any).from('feed_posts').select('*').eq('audience', 'koclar').neq('author_id', user.id).order('created_at', { ascending: false }).limit(10),
      (supabase as any).rpc('feed_suggestions'),
    ]);
    if (mine.error) { setSetupMissing(true); return; }
    setPosts(mine.data ?? []);
    setRecs(rec.data ?? []);
    setSuggestions(sug.data ?? []);
  }, [supabase]);

  // Paylaşımlar istemcide yüklenir (ana sayfanın sunucu tarafı yavaşlamasın)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function loadStudents() {
    if (students) return;
    const { data } = await (supabase as any).rpc('my_feed_students');
    const list: FeedStudent[] = data ?? [];
    // Sınıf seçimi için kurum bilgisi (öğrenci tablosundan; görülemezse sınıflar kurumsuz gruplanır)
    const ids = list.map((s) => s.id);
    if (ids.length) {
      const { data: rows } = await (supabase as any).from('students').select('id, kurum').in('id', ids);
      const kurumOf = new Map<string, string | null>((rows ?? []).map((r: any) => [r.id, r.kurum]));
      list.forEach((s) => { s.kurum = kurumOf.get(s.id) ?? null; });
    }
    setStudents(list);
  }

  function toggleClass(ids: string[]) {
    setSelected((p) => {
      const n = new Set(p);
      const allIn = ids.every((id) => n.has(id));
      ids.forEach((id) => (allIn ? n.delete(id) : n.add(id)));
      return n;
    });
  }

  function reset() {
    setUrl(''); setTitle(''); setBody(''); setTarget('all'); setSelected(new Set()); setQ(''); setDur('suresiz'); setStartDate(''); setEndDate('');
  }

  async function share(opts?: { url?: string; title?: string | null; source?: string; kind?: 'icerik' | 'duyuru'; audience?: 'ogrenciler' | 'koclar'; all?: boolean }) {
    const kind = opts?.kind ?? (tab === 'pano' ? 'duyuru' : 'icerik');
    const audience = opts?.audience ?? (tab === 'koclar' ? 'koclar' : 'ogrenciler');
    const all = opts?.all ?? (audience === 'koclar' || target === 'all');
    if (!all && selected.size === 0) { setMsg({ ok: false, text: 'En az bir öğrenci seçin ya da "Tüm öğrencilerim"i işaretleyin.' }); return; }
    // Öneriyi tek dokunuşla göndermek süresiz yayınlar; formdan gönderirken seçilen süre kullanılır
    const win = opts ? { starts: null, ends: null, error: undefined } : computeWindow(dur, startDate, endDate);
    if (win.error) { setMsg({ ok: false, text: win.error }); return; }
    setBusy(true);
    setMsg(null);
    const { error } = await (supabase as any).rpc('create_feed_post', {
      ...(win.starts ? { p_starts: win.starts } : {}),
      ...(win.ends ? { p_ends: win.ends } : {}),
      p_kind: kind, p_audience: audience,
      p_url: kind === 'icerik' ? (opts?.url ?? url).trim() : null,
      p_title: (opts?.title ?? title).trim() || null,
      p_body: kind === 'duyuru' ? body : (tab === 'koclar' && !opts ? body : null),
      p_student_ids: all ? null : Array.from(selected),
      p_source: opts?.source ?? null,
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: win.starts ? `${fmt(win.starts)} tarihinde yayına girecek ✓`
      : audience === 'koclar' ? 'Koçlara önerildi ✓' : kind === 'duyuru' ? 'Duyuru panoya eklendi ✓' : 'Öğrencilerinin ana sayfasına gönderildi ✓' });
    if (!opts) reset();
    load();
  }

  async function setLive(p: Post, live: boolean) {
    const { error } = await (supabase as any).rpc('set_feed_post_live', { p_id: p.id, p_live: live });
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    setMsg({ ok: true, text: live ? 'Tekrar yayında ✓' : 'Yayından kaldırıldı ✓' });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Bu paylaşım tamamen silinsin mi? (Yalnızca yayından kaldırmak için "Kaldır" düğmesini kullanın.)')) return;
    const { error } = await (supabase as any).from('feed_posts').delete().eq('id', id);
    if (!error) setPosts((p) => p.filter((x) => x.id !== id));
  }

  const embed = url.trim() ? parseEmbed(url) : null;
  const sentSources = new Set(posts.map((p) => p.source_post_id).filter(Boolean));
  const listed = posts.filter((p) => (tab === 'pano' ? p.kind === 'duyuru' && p.audience === 'ogrenciler'
    : tab === 'koclar' ? p.audience === 'koclar' : p.kind === 'icerik' && p.audience === 'ogrenciler'));
  const shown = showAll ? listed : listed.slice(0, 3);
  const filteredStudents = (students ?? []).filter((s) => !q || s.full_name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
  const classGroups = groupClasses(students ?? []);

  if (setupMissing) return null; // home_feed.sql henüz çalıştırılmamış

  const activeRecs = recs.filter(isActive);
  const pendingRecs = activeRecs.filter((r) => !sentSources.has(r.id)).length;
  const lastShare = posts.find((p) => p.audience === 'ogrenciler')?.created_at ?? null;

  const tabs: { key: Tab; label: string; icon: typeof IconPin }[] = [
    { key: 'icerik', label: 'İçerik paylaş', icon: IconBrandYoutube },
    { key: 'pano', label: 'Pano', icon: IconPin },
    ...(isAdmin ? [{ key: 'koclar' as Tab, label: 'Koçlara öner', icon: IconBulb }] : []),
  ];

  const canSubmit = tab === 'pano' ? body.trim().length > 0 : !!embed;

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-[var(--paper)]">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <IconSparkles size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-[var(--ink)]">Öğrencilerle paylaşım yap</span>
          <span className="block text-[12.5px] text-[var(--ink-muted)]">
            {lastShare ? `Video/içerik paylaş, panoya duyuru ekle · son paylaşım ${fmt(lastShare)}` : 'Video/içerik paylaş, panoya duyuru ekle'}
          </span>
        </span>
        {pendingRecs > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-800">
            <IconBulb size={14} /> {pendingRecs} yönetici önerisi
          </span>
        )}
        {!expanded && msg?.ok && <span className="text-[12.5px] font-medium text-emerald-600">{msg.text}</span>}
        <IconChevronDown size={18} className={`flex-shrink-0 text-[var(--ink-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && <>
      <div className="flex flex-wrap items-center gap-2 border-y border-[var(--border)] bg-[var(--paper)]/50 px-4 py-2">
        <div className="flex gap-1 rounded-xl bg-[var(--paper)] p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} type="button" onClick={() => { setTab(t.key); setMsg(null); setShowAll(false); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${tab === t.key ? 'bg-white text-violet-700 shadow-sm' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <div className="min-w-0 space-y-3">
          <p className="text-[12.5px] text-[var(--ink-muted)]">
            {tab === 'icerik' && 'YouTube, Instagram (gönderi/reels), X, TikTok, Vimeo, Spotify ya da herhangi bir sitenin bağlantısını yapıştır. Öğrencilerin ana sayfasında panonun altında görünür; yeni içerik gönderince öncekinin yerini alır.'}
            {tab === 'pano' && 'Genel duyurular öğrencilerin ana sayfasındaki panoda görünür ve öğrencilere bildirim gider.'}
            {tab === 'koclar' && 'Beğendiğin içeriği tüm koçlara öner; koçlar tek dokunuşla kendi öğrencilerine gönderebilir.'}
          </p>

          {tab !== 'pano' && (
            <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400" />
          )}
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150}
            placeholder={tab === 'pano' ? 'Başlık (isteğe bağlı), ör. Cumartesi deneme saati' : 'Kısa not (isteğe bağlı), ör. Bu hafta mutlaka izleyin'}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400" />
          {(tab === 'pano' || tab === 'koclar') && (
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={tab === 'pano' ? 4 : 2}
              placeholder={tab === 'pano' ? 'Duyuru metni…' : 'Koçlara not (isteğe bağlı)'}
              className="w-full resize-y rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[13.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400" />
          )}

          {tab !== 'pano' && url.trim() && !embed && <p className="text-[12.5px] text-rose-600">Bağlantı tanınmadı; https:// ile başlayan tam adresi yapıştır.</p>}
          {embed && <div className="max-w-md"><EmbedView url={url} title={title} compact /></div>}

          {tab !== 'koclar' && (
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex flex-wrap gap-4 text-[13px]">
                <label className="flex items-center gap-1.5"><input type="radio" checked={target === 'all'} onChange={() => setTarget('all')} /> Tüm öğrencilerim</label>
                <label className="flex items-center gap-1.5"><input type="radio" checked={target === 'selected'} onChange={() => { setTarget('selected'); loadStudents(); }} /> Sınıf / öğrenci seç {selected.size > 0 && <b>({selected.size} öğrenci)</b>}</label>
              </div>
              {target === 'selected' && (
                <div className="mt-2.5">
                  {classGroups.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Sınıflar</div>
                      {classGroups.map((g) => (
                        <div key={g.kurum}>
                          {classGroups.length > 1 && <div className="mb-1 text-[12px] font-semibold text-[var(--ink)]">{g.kurum}</div>}
                          <div className="flex flex-wrap gap-1.5">
                            {g.classes.map((c) => {
                              const n = c.ids.filter((id) => selected.has(id)).length;
                              const full = n === c.ids.length;
                              return (
                                <button key={c.name} type="button" onClick={() => toggleClass(c.ids)} aria-pressed={full}
                                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors ${full ? 'border-violet-500 bg-violet-600 text-white' : n > 0 ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-[var(--border)] text-[var(--ink)] hover:border-violet-300'}`}>
                                  {full && <IconCheck size={13} />} {c.name}
                                  <span className={full ? 'text-white/80' : 'text-[var(--ink-muted)]'}>({n > 0 && !full ? `${n}/` : ''}{c.ids.length})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <p className="text-[11.5px] text-[var(--ink-muted)]">Sınıfa dokununca tüm öğrencileri seçilir; aşağıdan tek tek ekleyip çıkarabilirsin.</p>
                    </div>
                  )}
                  <div className="relative mb-2">
                    <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ara"
                      className="w-full rounded-lg border border-[var(--border)] py-1.5 pl-8 pr-3 text-[13px] focus:outline-none" />
                  </div>
                  <div className="max-h-48 space-y-0.5 overflow-y-auto">
                    {students === null && <p className="text-[12.5px] text-[var(--ink-muted)]">Yükleniyor…</p>}
                    {filteredStudents.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] hover:bg-[var(--paper)]">
                        <input type="checkbox" checked={selected.has(s.id)}
                          onChange={() => setSelected((p) => { const n = new Set(p); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })} />
                        <span className="flex-1 truncate">{s.full_name}</span>
                        {s.sinif_sube && <span className="text-[11.5px] text-[var(--ink-muted)]">{s.sinif_sube}</span>}
                        {!s.has_account && <span className="text-[11px] text-amber-600" title="Öğrencinin hesabı yok; hesap açılınca görür">hesabı yok</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink)]"><IconCalendar size={15} /> Yayın süresi</div>
            <div className="flex flex-wrap gap-1.5">
              {DURS.map((d) => (
                <button key={d.key} type="button" onClick={() => setDur(d.key)}
                  className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${dur === d.key ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
                  {d.label}
                </button>
              ))}
            </div>
            {dur === 'ozel' && (
              <div className="mt-2.5 flex flex-wrap items-end gap-3 text-[12.5px]">
                <label className="flex flex-col gap-1 text-[var(--ink-muted)]">Başlangıç
                  <input type="date" value={startDate} min={todayStr()} onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-[13px] text-[var(--ink)]" />
                </label>
                <label className="flex flex-col gap-1 text-[var(--ink-muted)]">Bitiş
                  <input type="date" value={endDate} min={startDate || todayStr()} onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-[13px] text-[var(--ink)]" />
                </label>
                <span className="pb-2 text-[11.5px] text-[var(--ink-muted)]">Başlangıç boşsa hemen, bitiş boşsa süresiz.</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => share()} disabled={busy || !canSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
              <IconSend size={15} /> {busy ? 'Gönderiliyor…' : tab === 'pano' ? 'Panoya ekle' : tab === 'koclar' ? 'Koçlara öner' : 'Öğrencilere gönder'}
            </button>
            {msg && <span className={`text-[12.5px] font-medium ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</span>}
          </div>

          {/* Paylaştıklarım */}
          {listed.length > 0 && (
            <div className="pt-1">
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
                {tab === 'pano' ? 'Panodaki duyurular' : tab === 'koclar' ? 'Koçlara önerdiklerim' : 'Paylaştıklarım'}
              </h3>
              <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {shown.map((p) => {
                  const st = statusOf(p, posts);
                  return (
                  <li key={p.id} className={`flex items-start gap-3 px-3 py-2 ${st.live ? '' : 'opacity-60'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-[var(--ink)]">
                        {p.title || (p.url ? parseEmbed(p.url)?.label : null) || p.body?.slice(0, 60)}
                      </div>
                      <div className="text-[11.5px] text-[var(--ink-muted)]">
                        {fmt(p.created_at)} · {p.audience === 'koclar' ? 'tüm koçlar' : p.all_students ? 'tüm öğrencilerim' : 'seçili öğrenciler'}
                        {p.url && <> · <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">bağlantı</a></>}
                      </div>
                      {p.kind === 'duyuru' && p.body && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-[var(--ink-muted)]">{p.body}</p>}
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.tone === 'green' ? 'bg-emerald-50 text-emerald-700' : st.tone === 'blue' ? 'bg-sky-50 text-sky-700' : 'bg-[var(--paper)] text-[var(--ink-muted)]'}`}>{st.label}</span>
                    </div>
                    {st.live ? (
                      <button type="button" onClick={() => setLive(p, false)} title="Yayından kaldır"
                        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-semibold text-[var(--ink-muted)] hover:bg-amber-50 hover:text-amber-700"><IconPlayerStop size={15} /> Kaldır</button>
                    ) : (
                      <button type="button" onClick={() => setLive(p, true)} title="Tekrar yayınla (süresiz)"
                        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11.5px] font-semibold text-[var(--ink-muted)] hover:bg-emerald-50 hover:text-emerald-700"><IconPlayerPlay size={15} /> Yayınla</button>
                    )}
                    <button type="button" onClick={() => remove(p.id)} title="Tamamen sil"
                      className="rounded-md p-1 text-[var(--ink-muted)] hover:bg-rose-50 hover:text-rose-600"><IconTrash size={15} /></button>
                  </li>
                  );
                })}
              </ul>
              {listed.length > 3 && (
                <button type="button" onClick={() => setShowAll(!showAll)} className="mt-1.5 flex items-center gap-1 text-[12.5px] font-medium text-violet-700">
                  {showAll ? 'Daha az göster' : `Tümünü göster (${listed.length})`} <IconChevronDown size={14} className={showAll ? 'rotate-180' : ''} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Öneriler */}
        {tab !== 'pano' && (
          <aside className="min-w-0 space-y-3 rounded-xl bg-[var(--paper)] p-3">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]"><IconBulb size={16} className="text-amber-500" /> Öneriler</h3>

            {tab === 'icerik' && activeRecs.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Yöneticiden</div>
                {activeRecs.map((r) => {
                  const sent = sentSources.has(r.id);
                  return (
                    <div key={r.id} className="rounded-lg border border-amber-200 bg-white p-2.5">
                      <div className="truncate text-[13px] font-medium text-[var(--ink)]">{r.title || (r.url ? parseEmbed(r.url)?.label : '')}</div>
                      {r.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--ink-muted)]">{r.body}</p>}
                      <div className="mt-1.5 flex items-center gap-2">
                        {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink)]"><IconExternalLink size={13} /> İncele</a>}
                        <button type="button" disabled={busy || sent} onClick={() => share({ url: r.url ?? '', title: r.title, source: r.id, kind: 'icerik', audience: 'ogrenciler', all: true })}
                          className="ml-auto flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-amber-600 disabled:bg-emerald-500 disabled:opacity-100">
                          {sent ? <><IconCheck size={13} /> Gönderildi</> : <><IconUsers size={13} /> Öğrencilerime gönder</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Diğer koçlar paylaştı</div>
                {suggestions.map((s) => (
                  <button key={s.url} type="button" onClick={() => { setUrl(s.url); setTitle(s.title ?? ''); }}
                    className="block w-full rounded-lg bg-white px-2.5 py-2 text-left hover:ring-1 hover:ring-violet-300">
                    <span className="block truncate text-[13px] font-medium text-[var(--ink)]">{s.title || parseEmbed(s.url)?.label}</span>
                    <span className="block truncate text-[11.5px] text-[var(--ink-muted)]">{parseEmbed(s.url)?.host} · {s.share_count} koç paylaştı · forma ekle</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--ink-muted)]">Bu hafta için konu fikirleri</div>
              {ideas.map((i) => (
                <a key={i.title} href={i.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-white px-2.5 py-2 hover:ring-1 hover:ring-violet-300">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink)]"><IconBrandYoutube size={15} className="text-red-500" /> {i.title}</span>
                  <span className="block text-[11.5px] text-[var(--ink-muted)]">{i.why}</span>
                </a>
              ))}
              <p className="text-[11.5px] leading-snug text-[var(--ink-muted)]">Fikre tıkla, YouTube’da beğendiğin videonun bağlantısını kopyalayıp yukarıya yapıştır.</p>
            </div>
          </aside>
        )}
      </div>
      <div className="flex justify-end border-t border-[var(--border)] px-4 py-2">
        <button type="button" onClick={() => setExpanded(false)} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-[var(--ink-muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]">
          Kapat <IconChevronDown size={14} className="rotate-180" />
        </button>
      </div>
      </>}
    </section>
  );
}
