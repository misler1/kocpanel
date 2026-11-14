'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconChevronDown, IconListDetails, IconSearch } from '@tabler/icons-react';
import { PageHero } from '@/components/ui/PageHero';
import { STAFF_STATUS_LABEL } from '@/lib/staff-access';

type Row = {
  id: number; actor_id: string; actor_name: string | null; actor_status: string | null;
  student_id: string | null; student_name: string | null; area: string; action: 'ekledi' | 'güncelledi' | 'sildi';
  summary: string; changes: Record<string, { once: any; sonra: any }> | { _alanlar: string[] } | null; link: string | null; created_at: string;
};

const AREAS: Record<string, { label: string; emoji: string }> = {
  gunluk: { label: 'Günlük giriş', emoji: '✅' },
  program: { label: 'Haftalık program', emoji: '🗓️' },
  konu: { label: 'Konu ilerleyişi', emoji: '📚' },
  deneme: { label: 'Deneme', emoji: '📊' },
  gorusme: { label: 'Görüşme', emoji: '💬' },
  ogrenci: { label: 'Öğrenci bilgisi', emoji: '🧑‍🎓' },
  gorev: { label: 'Görev', emoji: '📋' },
  randevu: { label: 'Randevu', emoji: '📅' },
  paylasim: { label: 'Paylaşım', emoji: '📣' },
};

const ACTION_CLS: Record<string, string> = {
  ekledi: 'bg-emerald-50 text-emerald-700',
  'güncelledi': 'bg-sky-50 text-sky-700',
  sildi: 'bg-rose-50 text-rose-700',
};

// Değişiklik ayrıntısında alan adlarının okunur karşılıkları (bilinmeyen alan olduğu gibi gösterilir)
const FIELD: Record<string, string> = {
  done_count: 'Çözülen soru', target_count: 'Hedef soru', student_done: 'Yaptı', student_missed: 'Yapmadı',
  student_missed_note: 'Yapmama notu', student_missed_by: 'Yapmadı işaretleyen', topic_done_minutes: 'Çalışılan dakika',
  topic_target_minutes: 'Hedef dakika', subject: 'Ders', topic: 'Konu', resource_name: 'Kaynak', plan_day: 'Gün',
  start_time: 'Başlangıç', end_time: 'Bitiş', status: 'Durum', konu_tamamlandi: 'Konu tamamlandı',
  kaynak1_sorular: '1. kaynak', kaynak2_sorular: '2. kaynak', kaynak3_sorular: '3. kaynak', yanlislar_kontrol: 'Yanlışlar kontrol',
  exam_name: 'Deneme adı', exam_date: 'Tarih', net_score: 'Net', subject_results: 'Ders sonuçları', analysis_done: 'Analiz yapıldı',
  notes: 'Notlar', scheduled_at: 'Tarih', duration_minutes: 'Süre', meeting_type: 'Görüşme türü', title: 'Başlık',
  completed: 'Tamamlandı', due_date: 'Son tarih', full_name: 'Ad soyad', phone: 'Telefon', tasks: 'Görevler', note: 'Not',
  starts_at: 'Başlangıç', week_start: 'Hafta başı', week_end: 'Hafta sonu', photos: 'Fotoğraflar', daily_entries: 'Günlük girişler',
};

const show = (v: any): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (v === true) return 'evet';
  if (v === false) return 'hayır';
  if (typeof v === 'object') return Array.isArray(v) ? `${v.length} öğe` : '(ayrıntılı veri)';
  const s = String(v);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
};

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
const dayLabel = (key: string) => {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  const y = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
  if (key === today) return 'Bugün';
  if (key === y) return 'Dün';
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
};
const time = (iso: string) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
const statusLabel = (s: string | null) => (s === 'intern' ? 'Stajyer koç' : s ? STAFF_STATUS_LABEL[s] ?? '' : '');

const SEEN_KEY = 'ekip-kayitlari-son-bakis';

export function EkipKayitlariClient({ rows, missing, people, initialPerson, days, isAdmin, all }: {
  rows: Row[]; missing: boolean; people: { id: string; name: string; status: string }[];
  initialPerson: string; days: number; isAdmin: boolean; all: boolean;
}) {
  const [person, setPerson] = useState(initialPerson);
  const [area, setArea] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  // "Yeni" işareti: bu sayfaya son bakıştan sonra gelen kayıtlar (yalnızca bu tarayıcıda hatırlanır)
  useEffect(() => {
    let prev: string | null = null;
    try { prev = localStorage.getItem(SEEN_KEY); localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* depolama kapalı */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSeen(prev);
  }, []);

  // Kişi listesi: bağlı personel + (yöneticide "tümü" açıksa) kayıtlarda geçen diğer kişiler
  const personOptions = useMemo(() => {
    const map = new Map(people.map((p) => [p.id, p]));
    rows.forEach((r) => { if (!map.has(r.actor_id)) map.set(r.actor_id, { id: r.actor_id, name: r.actor_name ?? 'Personel', status: r.actor_status ?? '' }); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [people, rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLocaleLowerCase('tr');
    return rows.filter((r) =>
      (!person || r.actor_id === person) && (!area || r.area === area)
      && (!qq || `${r.student_name ?? ''} ${r.summary}`.toLocaleLowerCase('tr').includes(qq)));
  }, [rows, person, area, q]);

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    filtered.forEach((r) => { const k = dayKey(r.created_at); if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); });
    return Array.from(m.entries());
  }, [filtered]);

  const areasPresent = Array.from(new Set(rows.map((r) => r.area)));
  const newCount = lastSeen ? rows.filter((r) => r.created_at > lastSeen).length : 0;
  const href = (o: { gun?: number; tum?: boolean }) => {
    const p = new URLSearchParams();
    p.set('gun', String(o.gun ?? days));
    if (o.tum ?? all) p.set('tum', '1');
    if (person) p.set('kisi', person);
    return `/ekip-kayitlari?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHero
        theme="violet"
        icon={<IconListDetails size={22} />}
        title="Ekip kayıtları"
        subtitle={all ? 'Bütün personelin yaptığı ekleme, değişiklik ve silmeler' : 'Size bağlı stajyer koç ve personelin yaptığı ekleme, değişiklik ve silmeler'}
        chips={[`Son ${days} gün · ${rows.length} kayıt`, newCount > 0 ? `${newCount} yeni` : null]}
      />

      {missing ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-[13px] text-gray-500">
          Ekip kayıtları henüz etkin değil (supabase/staff_activity.sql çalıştırılmalı).
        </p>
      ) : (
        <>
          <div className="mb-4 space-y-2.5 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <select value={person} onChange={(e) => setPerson(e.target.value)}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[13px] text-gray-700">
                <option value="">Herkes</option>
                {personOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{statusLabel(p.status) ? ` (${statusLabel(p.status)})` : ''}</option>
                ))}
              </select>
              <div className="relative">
                <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci ya da kayıt ara"
                  className="w-52 rounded-lg border border-gray-200 py-1.5 pl-8 pr-2.5 text-[13px] text-gray-700 focus:border-violet-400 focus:outline-none" />
              </div>
              <div className="ml-auto flex gap-1 rounded-lg bg-gray-100 p-1">
                {[7, 30, 90].map((d) => (
                  <Link key={d} href={href({ gun: d })}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {d} gün
                  </Link>
                ))}
              </div>
              {isAdmin && (
                <Link href={href({ tum: !all })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium ${all ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {all ? '✓ Bütün personel' : 'Bütün personeli göster'}
                </Link>
              )}
            </div>
            {areasPresent.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setArea('')}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium ${!area ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-violet-50'}`}>Hepsi</button>
                {areasPresent.map((a) => (
                  <button key={a} type="button" onClick={() => setArea(a)}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium ${area === a ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-violet-50'}`}>
                    {AREAS[a]?.emoji ?? '•'} {AREAS[a]?.label ?? a}
                  </button>
                ))}
              </div>
            )}
          </div>

          {groups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-white py-14 text-center text-[13px] text-gray-400">
              {rows.length === 0 ? `Son ${days} günde kayıt yok.` : 'Bu filtrelerle eşleşen kayıt yok.'}
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map(([k, list]) => (
                <section key={k}>
                  <h2 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-gray-500">{dayLabel(k)} · {list.length}</h2>
                  <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {list.map((r) => {
                      const isNew = !!lastSeen && r.created_at > lastSeen;
                      const ch = r.changes as any;
                      const changeList: [string, { once: any; sonra: any }][] = ch && !ch._alanlar ? Object.entries(ch) : [];
                      const hasDetail = changeList.length > 0 || (ch?._alanlar?.length ?? 0) > 0;
                      return (
                        <li key={r.id} className={isNew ? 'bg-violet-50/50' : ''}>
                          <div className="flex items-start gap-3 px-3.5 py-2.5">
                            <span className="mt-0.5 w-11 flex-shrink-0 text-[12px] tabular-nums text-gray-400">{time(r.created_at)}</span>
                            <span className="mt-0.5 text-[15px]" aria-hidden>{AREAS[r.area]?.emoji ?? '•'}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] text-gray-900">
                                {r.link ? <Link href={r.link} className="hover:text-violet-700 hover:underline">{r.summary}</Link> : r.summary}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-gray-500">
                                <span className="font-medium text-gray-700">{r.actor_name ?? 'Personel'}</span>
                                {statusLabel(r.actor_status) && <span>({statusLabel(r.actor_status)})</span>}
                                {r.student_name && <>· {r.student_id ? <Link href={`/ogrenciler/${r.student_id}`} className="hover:underline">{r.student_name}</Link> : r.student_name}</>}
                                <span className={`rounded-full px-1.5 py-px text-[10.5px] font-semibold ${ACTION_CLS[r.action] ?? ''}`}>{r.action}</span>
                                {isNew && <span className="rounded-full bg-violet-600 px-1.5 py-px text-[10.5px] font-semibold text-white">yeni</span>}
                              </p>
                            </div>
                            {hasDetail && (
                              <button type="button" onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                                className="flex flex-shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-[11.5px] text-gray-500 hover:bg-gray-100">
                                Ayrıntı <IconChevronDown size={13} className={open[r.id] ? 'rotate-180' : ''} />
                              </button>
                            )}
                          </div>
                          {open[r.id] && hasDetail && (
                            <div className="mx-3.5 mb-3 ml-[4.25rem] rounded-lg bg-gray-50 px-3 py-2 text-[12px]">
                              {changeList.length > 0 ? (
                                <table className="w-full">
                                  <tbody>
                                    {changeList.map(([f, v]) => (
                                      <tr key={f} className="align-top">
                                        <td className="py-0.5 pr-3 font-medium text-gray-600">{FIELD[f] ?? f}</td>
                                        <td className="py-0.5 text-gray-400 line-through">{show(v?.once)}</td>
                                        <td className="px-1.5 py-0.5 text-gray-400">→</td>
                                        <td className="py-0.5 text-gray-900">{show(v?.sonra)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-gray-600">Değişen alanlar: {(ch._alanlar as string[]).map((f) => FIELD[f] ?? f).join(', ')}</p>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {rows.length >= 1000 && <p className="mt-3 text-center text-[12px] text-gray-400">En son 1000 kayıt gösteriliyor; daha kısa bir aralık seçin.</p>}
        </>
      )}
    </div>
  );
}
