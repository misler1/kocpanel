'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconSparkles, IconRefresh, IconCopy, IconX, IconCheck, IconCalendarPlus } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import type { AssistantKind, WeeklyAdvice, ProgramDraft, MeetingPrep } from '@/lib/ai/studentAssistant';

// Öğrenci detayı > Yapay zeka asistanı. Üç iş: haftalık öneri, program taslağı, görüşme hazırlığı.
// Son sonuç bu tarayıcıda saklanır (sayfa yenilense de kaybolmaz); veritabanına yazılmaz.
// Program taslağı koç onaylarsa öğrencinin bir sonraki program haftasına görev olarak eklenir.

const KINDS: { id: AssistantKind; label: string; desc: string }[] = [
  { id: 'haftalik', label: 'Haftalık öneri', desc: 'Son denemeler, program uyumu ve zayıf konulara göre bu hafta neye odaklanmalı.' },
  { id: 'program', label: 'Program taslağı', desc: 'Eksiklere göre bir sonraki program haftası için günlük görev taslağı. Düzenleyip programa ekleyebilirsiniz.' },
  { id: 'gorusme', label: 'Görüşme hazırlığı', desc: 'Görüşmeden önce son durum, dikkat edilecekler, sorulabilecek sorular ve gündem.' },
];

type Saved = { kind: AssistantKind; data: any; created_at: string };
const keyOf = (kind: AssistantKind, sid: string) => `kd:ai:${kind}:${sid}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function YapayZekaAsistani({ studentId, only }: { studentId: string; only?: AssistantKind }) {
  const [kind, setKind] = useState<AssistantKind>(only ?? 'haftalik');
  const [saved, setSaved] = useState<Partial<Record<AssistantKind, Saved>>>({});
  const [busy, setBusy] = useState<AssistantKind | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const out: Partial<Record<AssistantKind, Saved>> = {};
    for (const k of KINDS) {
      try { const v = localStorage.getItem(keyOf(k.id, studentId)); if (v) out[k.id] = JSON.parse(v); } catch { /* depolama kapalı */ }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(out);
  }, [studentId]);

  function store(s: Saved) {
    setSaved((p) => ({ ...p, [s.kind]: s }));
    try { localStorage.setItem(keyOf(s.kind, studentId), JSON.stringify(s)); } catch { /* depolama kapalı */ }
  }

  async function generate(k: AssistantKind) {
    setBusy(k); setError(''); setCopied(false);
    try {
      const res = await fetch('/api/ogrenci-asistan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId, kind: k }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data) throw new Error(body?.error ?? 'Öneri hazırlanamadı.');
      store({ kind: k, data: body.data, created_at: body.created_at });
    } catch (e: any) {
      setError(e?.message ?? 'Öneri hazırlanamadı.');
    } finally {
      setBusy(null);
    }
  }

  const cur = saved[kind];
  const meta = KINDS.find((k) => k.id === kind)!;

  async function copy() {
    if (!cur) return;
    try { await navigator.clipboard.writeText(toText(cur)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* izin yok */ }
  }

  return (
    <div>
      {!only && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button key={k.id} type="button" onClick={() => { setKind(k.id); setError(''); }}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${kind === k.id
                ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
              {k.label}
            </button>
          ))}
        </div>
      )}

      {!cur && busy !== kind && (
        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 p-4">
          <p className="text-[13px] text-gray-600">{meta.desc}</p>
          <button type="button" onClick={() => generate(kind)} disabled={!!busy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            <IconSparkles size={16} /> {meta.label} hazırla
          </button>
        </div>
      )}

      {busy === kind && (
        <div className="flex items-center gap-2 rounded-xl bg-violet-50 p-4 text-[13px] text-violet-800">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700" />
          Hazırlanıyor… Öğrencinin denemeleri, programı ve görüşmeleri okunuyor (20–60 saniye sürebilir).
        </div>
      )}

      {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p>}

      {cur && busy !== kind && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
            <span>{fmtTime(cur.created_at)} tarihinde hazırlandı</span>
            <span className="ml-auto flex gap-1">
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-gray-100">
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />} {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
              <button type="button" onClick={() => generate(kind)} disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-violet-700 hover:bg-violet-50 disabled:opacity-60">
                <IconRefresh size={14} /> Yeniden hazırla
              </button>
            </span>
          </div>
          {cur.kind === 'haftalik' && <Haftalik d={cur.data} />}
          {cur.kind === 'gorusme' && <Gorusme d={cur.data} />}
          {cur.kind === 'program' && (
            <Program d={cur.data} studentId={studentId}
              onChange={(data) => store({ ...cur, data })} />
          )}
          <p className="mt-3 text-[11.5px] text-gray-400">Yapay zeka önerisidir; kararı siz verin. Sayılar sistemdeki kayıtlardan alınır.</p>
        </div>
      )}
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items?.length) return null;
  return (
    <div className={`rounded-xl p-3 ${tone}`}>
      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide opacity-80">{title}</p>
      <ul className="list-disc space-y-1 pl-4 text-[13px]">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}

function Haftalik({ d }: { d: WeeklyAdvice }) {
  return (
    <div className="space-y-3">
      {d.ozet && <p className="text-[13.5px] leading-relaxed text-gray-800">{d.ozet}</p>}
      <ol className="space-y-2">
        {d.odaklar.map((o, i) => (
          <li key={i} className="rounded-xl border border-violet-100 bg-white p-3">
            <div className="flex items-start gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-[12px] font-bold text-white">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-gray-900">{o.baslik}</p>
                {o.neden && <p className="mt-0.5 text-[12.5px] text-gray-500">{o.neden}</p>}
                {o.ne_yapmali && <p className="mt-1 text-[13px] text-gray-800"><b>Yapılacak:</b> {o.ne_yapmali}</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <List title="Görüşmede konuşun" items={d.gorusmede_konus} tone="bg-teal-50 text-teal-900" />
      {d.ogrenciye_mesaj && (
        <div className="rounded-xl bg-amber-50 p-3 text-amber-900">
          <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide opacity-80">Öğrenciye gönderilebilecek mesaj</p>
          <p className="text-[13px]">{d.ogrenciye_mesaj}</p>
        </div>
      )}
    </div>
  );
}

function Gorusme({ d }: { d: MeetingPrep }) {
  return (
    <div className="space-y-2.5">
      {d.durum && <p className="text-[13.5px] leading-relaxed text-gray-800">{d.durum}</p>}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <List title="İyi gidenler" items={d.iyi_gidenler} tone="bg-emerald-50 text-emerald-900" />
        <List title="Dikkat" items={d.dikkat} tone="bg-rose-50 text-rose-900" />
      </div>
      <List title="Sorabileceğiniz sorular" items={d.sorular} tone="bg-sky-50 text-sky-900" />
      <List title="Gündem" items={d.gundem} tone="bg-violet-50 text-violet-900" />
    </div>
  );
}

function Program({ d, studentId, onChange }: { d: ProgramDraft & { eklendi?: boolean }; studentId: string; onChange: (d: any) => void }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const total = d.gunler.reduce((a, g) => a + g.gorevler.length, 0);

  function remove(di: number, ti: number) {
    onChange({ ...d, gunler: d.gunler.map((g, i) => (i === di ? { ...g, gorevler: g.gorevler.filter((_, j) => j !== ti) } : g)) });
  }
  function setSoru(di: number, ti: number, v: string) {
    const soru = Math.max(0, Math.min(500, Number(v) || 0));
    onChange({ ...d, gunler: d.gunler.map((g, i) => (i === di ? { ...g, gorevler: g.gorevler.map((t, j) => (j === ti ? { ...t, soru } : t)) } : g)) });
  }

  async function addToProgram() {
    setSaving(true); setErr('');
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    const rows = d.gunler.flatMap((g) => g.gorevler.map((t) => ({
      student_id: studentId, coach_id: user?.id, subject: t.ders, topic: t.konu || null, resource_name: null,
      week_start: d.week_start, week_end: d.week_end, plan_day: g.plan_day, start_time: null, end_time: null,
      target_count: t.soru || 0, done_count: 0, topic_target_minutes: t.dakika || null, topic_done_minutes: 0,
    })));
    const { error } = await supabase.from('question_logs').insert(rows);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onChange({ ...d, eklendi: true });
  }

  return (
    <div className="space-y-3">
      {d.aciklama && <p className="text-[13.5px] leading-relaxed text-gray-800">{d.aciklama}</p>}
      <p className="text-[12.5px] text-gray-500">
        Program: <b>{fmtDay(d.week_start)} – {fmtDay(d.week_end)}</b>
        {d.mevcut_gorev > 0 && <span className="text-amber-700"> · Bu haftada zaten {d.mevcut_gorev} görev var; taslak bunlara eklenir.</span>}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {d.gunler.map((g, di) => (
          <div key={g.tarih} className="rounded-xl border border-indigo-100 bg-white p-2.5">
            <p className="mb-1.5 text-[12.5px] font-semibold text-indigo-800">{g.gun} <span className="font-normal text-gray-400">{fmtDay(g.tarih)}</span></p>
            {g.gorevler.length === 0 ? <p className="text-[12px] text-gray-400">Görev yok</p> : (
              <ul className="space-y-1.5">
                {g.gorevler.map((t, ti) => (
                  <li key={ti} className="flex items-start gap-1.5 rounded-lg bg-indigo-50/60 px-2 py-1.5 text-[12.5px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{t.ders}</p>
                      {t.konu && <p className="text-gray-600">{t.konu}</p>}
                      <p className="mt-0.5 flex items-center gap-1 text-gray-500">
                        {d.eklendi ? <span>{t.soru ? `${t.soru} soru` : ''}</span> : (
                          <><input type="number" min={0} value={t.soru} onChange={(e) => setSoru(di, ti, e.target.value)}
                            className="w-14 rounded border border-gray-200 bg-white px-1 py-0.5 text-[12px]" aria-label="Soru hedefi" /> soru</>
                        )}
                        {t.dakika ? <span>· {t.dakika} dk konu</span> : null}
                      </p>
                    </div>
                    {!d.eklendi && (
                      <button type="button" onClick={() => remove(di, ti)} aria-label="Görevi çıkar" title="Görevi çıkar"
                        className="rounded p-0.5 text-gray-400 hover:bg-white hover:text-rose-600"><IconX size={14} /></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">Eklenemedi: {err}</p>}
      {d.eklendi ? (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
          <IconCheck size={16} /> Taslak programa eklendi.
          <Link href={`/haftalik-takip?ogrenci=${studentId}`} className="font-semibold underline">Programı aç →</Link>
        </p>
      ) : (
        <button type="button" onClick={addToProgram} disabled={saving || total === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          <IconCalendarPlus size={16} /> {saving ? 'Ekleniyor…' : `Programa ekle (${total} görev)`}
        </button>
      )}
    </div>
  );
}

/** Kopyala: düz metin */
function toText(s: Saved): string {
  const li = (a: string[]) => a.map((x) => `- ${x}`).join('\n');
  if (s.kind === 'haftalik') {
    const d = s.data as WeeklyAdvice;
    return [d.ozet, '', ...d.odaklar.map((o, i) => `${i + 1}. ${o.baslik}\n   ${o.neden}\n   Yapılacak: ${o.ne_yapmali}`),
      '', 'Görüşmede konuşun:', li(d.gorusmede_konus), '', 'Öğrenciye mesaj:', d.ogrenciye_mesaj].join('\n');
  }
  if (s.kind === 'gorusme') {
    const d = s.data as MeetingPrep;
    return [d.durum, '', 'İyi gidenler:', li(d.iyi_gidenler), '', 'Dikkat:', li(d.dikkat), '', 'Sorular:', li(d.sorular), '', 'Gündem:', li(d.gundem)].join('\n');
  }
  const d = s.data as ProgramDraft;
  return [d.aciklama, '', ...d.gunler.map((g) => `${g.gun} ${fmtDay(g.tarih)}:\n${g.gorevler.map((t) => `- ${t.ders}${t.konu ? ` · ${t.konu}` : ''}${t.soru ? ` · ${t.soru} soru` : ''}${t.dakika ? ` · ${t.dakika} dk` : ''}`).join('\n') || '- Görev yok'}`)].join('\n');
}
