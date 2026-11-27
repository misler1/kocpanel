'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, type ReactNode } from 'react';
import {
  IconBolt, IconBell, IconSchool, IconRepeat, IconAlarm, IconPlus, IconX, IconCheck,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { PageHero } from '@/components/ui/PageHero';

// Ayar anahtarları: supabase/otomasyonlar.sql. Anahtar yoksa AÇIK sayılır.
type Prefs = Record<string, unknown>;

const COACH_NOTIFS: { key: string; label: string; desc: string }[] = [
  { key: 'koc_mesaj', label: 'Mesajlar', desc: 'Size yeni mesaj gelince' },
  { key: 'koc_sabah', label: 'Dün günlük girmeyenler', desc: 'Her sabah, dün günlük girmeyen ya da eksik giren öğrencilerin listesi' },
  { key: 'koc_gunluk', label: 'Öğrenci günlüğünü girdi', desc: 'Aynı gün içindeki girişler tek bildirimde toplanır' },
  { key: 'koc_deneme', label: 'Öğrenci deneme sonucu girdi', desc: 'Öğrenci kendi deneme sonucunu girince' },
  { key: 'koc_konu', label: 'Konu ilerleyişi güncellendi', desc: 'Öğrenci ya da belletmen konu işaretleyince' },
  { key: 'koc_ilk_giris', label: 'Öğrenci ilk kez giriş yaptı', desc: 'Açtığınız hesapla ilk giriş yapılınca' },
  { key: 'koc_program', label: 'Program onayı ve talepleri', desc: 'Öğrenci kendine program yapınca, program isteyince ya da personel program hazırlayınca' },
  { key: 'koc_randevu', label: 'Görüşme (Ajanda)', desc: 'Size görüşme planlanınca ya da öğrenci saat değişikliği isteyince' },
  { key: 'koc_ekip', label: 'Ekip kayıtları', desc: 'Stajyer ya da personel bir kayıt ekleyip değiştirince' },
  { key: 'koc_stajyer', label: 'Stajyerin öğrencilerinden gelenler', desc: 'Stajyerinize giden öğrenci bildirimlerinin size gelen kopyası' },
  { key: 'koc_rapor', label: 'Haftalık raporlar hazır', desc: 'Otomatik raporlar oluşunca' },
  { key: 'koc_oneri', label: 'Yönetici içerik önerisi', desc: 'Öğrencilere gönderebileceğiniz içerik önerilince' },
  { key: 'koc_basvuru', label: 'Öğrenci başvurusu', desc: 'Size bir öğrenci başvurusu atanınca' },
];

const STUDENT_NOTIFS: { key: string; label: string; desc: string }[] = [
  { key: 'ogr_program', label: 'Program bildirimleri', desc: '"Yeni haftalık programın hazır", program güncellendi / onaylandı' },
  { key: 'ogr_deneme', label: 'Deneme bildirimleri', desc: 'Deneme sonucu ya da deneme analizi eklenince' },
  { key: 'ogr_randevu', label: 'Görüşme bildirimleri', desc: 'Öğrenciyle görüşme planlanınca' },
  { key: 'ogr_paylasim', label: 'Ana sayfa paylaşımları', desc: 'Paylaştığınız içerik ya da duyuru yayına girince' },
  { key: 'ogr_hatirlatma', label: 'Çalışma hatırlatması', desc: 'Öğrencilere ayarlanan saatlerde "Günlüğünü doldurma zamanı"' },
];

const DAYS_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const HOURS = [7, 8, 9, 10, 11, 12];

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-[var(--accent)]' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function Section({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-start gap-2.5 border-b border-[var(--border)] px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1B4A8A] to-[#0FA3A8] text-white">{icon}</span>
        <div>
          <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">{title}</h2>
          {desc && <p className="text-[12px] text-[var(--ink-muted)]">{desc}</p>}
        </div>
      </div>
      <div className="divide-y divide-[var(--border)]">{children}</div>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-[var(--ink)]">{label}</div>
        {desc && <div className="text-[12px] text-[var(--ink-muted)]">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

const selectCls = 'rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--accent)]';

export function OtomasyonlarClient({ coachId, initialPrefs, ready, activeStudents }: {
  coachId: string; initialPrefs: Prefs; ready: boolean; activeStudents: number;
}) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const isOn = (key: string) => prefs[key] !== false;
  const sabah = Number.isInteger(prefs.sabah_saati) ? (prefs.sabah_saati as number) : 10;
  const raporGunu = Number.isInteger(prefs.rapor_gunu) ? (prefs.rapor_gunu as number) : 0;

  async function update(patch: Prefs) {
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setStatus(null);
    const { error } = await (createClient() as any).rpc('set_automation_prefs', { p_prefs: next });
    if (error) {
      setPrefs(prev);
      setStatus({ ok: false, text: /set_automation_prefs/i.test(error.message)
        ? 'Otomasyonlar henüz etkin değil (supabase/otomasyonlar.sql çalıştırılmalı).' : 'Kaydedilemedi: ' + error.message });
      return;
    }
    setStatus({ ok: true, text: 'Kaydedildi' });
  }

  function setAll(keys: string[], value: boolean) {
    const patch: Prefs = {};
    for (const k of keys) patch[k] = value;
    update(patch);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHero theme="slate" icon={<IconBolt size={22} />} title="Otomasyonlar" backHref="/ayarlar"
        subtitle="Sistemin kendiliğinden yaptığı işleri ve gönderdiği bildirimleri buradan yönetin. Ayarlar yalnızca sizin hesabınız ve öğrencileriniz için geçerlidir." />

      {!ready && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          Otomasyon ayarları henüz etkin değil: Supabase SQL Editor&apos;da <b>supabase/otomasyonlar.sql</b> çalıştırılmalı.
        </p>
      )}

      <div className="sticky top-2 z-10 mb-3 flex h-6 justify-end">
        {status && (
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium shadow-sm ${status.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {status.ok && <IconCheck size={13} />}{status.text}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <Section icon={<IconRepeat size={17} />} title="Otomatik işler">
          <Row label="Dün günlük girmeyenler listesi" desc={isOn('koc_sabah') ? 'Her sabah seçtiğiniz saatte gelir' : 'Bildirimi aşağıda kapalı'}>
            <select value={sabah} onChange={(e) => update({ sabah_saati: Number(e.target.value) })} className={selectCls} disabled={!isOn('koc_sabah')}>
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
            <Toggle on={isOn('koc_sabah')} onChange={(v) => update({ koc_sabah: v })} />
          </Row>
          <Row label="Haftalık öğrenci raporu" desc={isOn('rapor_otomatik') ? `Her ${DAYS_LONG[raporGunu].toLowerCase()} 08:00'de önceki 7 günün raporu oluşur` : 'Otomatik rapor oluşturulmaz; öğrenci sayfasından istediğiniz zaman alabilirsiniz'}>
            <select value={raporGunu} onChange={(e) => update({ rapor_gunu: Number(e.target.value) })} className={selectCls} disabled={!isOn('rapor_otomatik')}>
              {DAYS_LONG.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <Toggle on={isOn('rapor_otomatik')} onChange={(v) => update({ rapor_otomatik: v })} />
          </Row>
          <Row label="Görüşmeyi programa ekle" desc="Ajandaya eklediğiniz öğrenci görüşmesi öğrencinin haftalık programına “Görüşme” görevi olarak düşer">
            <Toggle on={isOn('gorusme_gorevi')} onChange={(v) => update({ gorusme_gorevi: v })} />
          </Row>
        </Section>

        <Section icon={<IconBell size={17} />} title="Size gelen bildirimler" desc="Kapattığınız bildirim ne panelde ne telefonda görünür.">
          <div className="flex justify-end gap-3 px-4 py-2 text-[12px] font-semibold">
            <button type="button" onClick={() => setAll(COACH_NOTIFS.map((n) => n.key), true)} className="text-[var(--accent-dark)] hover:underline">Tümünü aç</button>
            <button type="button" onClick={() => setAll(COACH_NOTIFS.map((n) => n.key), false)} className="text-[var(--ink-muted)] hover:underline">Tümünü kapat</button>
          </div>
          {COACH_NOTIFS.map((n) => (
            <Row key={n.key} label={n.label} desc={n.desc}>
              <Toggle on={isOn(n.key)} onChange={(v) => update({ [n.key]: v })} />
            </Row>
          ))}
        </Section>

        <Section icon={<IconSchool size={17} />} title="Öğrencilerinize giden bildirimler" desc="Öğrencinin mesaj ve hesap bildirimleri her zaman gider.">
          {STUDENT_NOTIFS.map((n) => (
            <Row key={n.key} label={n.label} desc={n.desc}>
              <Toggle on={isOn(n.key)} onChange={(v) => update({ [n.key]: v })} />
            </Row>
          ))}
        </Section>

        <BulkReminder coachId={coachId} activeStudents={activeStudents} disabled={!isOn('ogr_hatirlatma')} />
      </div>
    </div>
  );
}

// Çalışma hatırlatması saatlerini ve günlerini tüm aktif öğrencilere tek seferde uygula (öğrenci detayındaki ayarla aynı)
function BulkReminder({ coachId, activeStudents, disabled }: { coachId: string; activeStudents: number; disabled: boolean }) {
  const [times, setTimes] = useState<string[]>(['20:00']);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function apply(off = false) {
    const clean = off ? [] : [...new Set(times.filter(Boolean))].sort();
    if (clean.length > 0 && days.length === 0) { setMsg({ ok: false, text: 'En az bir gün seçin.' }); return; }
    if (!confirm(clean.length
      ? `Bu saatler (${clean.join(', ')}) ve günler tüm aktif öğrencilerinize uygulansın mı? Öğrencilerin mevcut hatırlatma ayarları değişir.`
      : 'Tüm aktif öğrencilerinizin hatırlatması kapatılsın mı?')) return;
    setBusy(true); setMsg(null);
    const { data, error } = await (createClient().from('students') as any)
      .update({ reminder_times: clean, reminder_days: days }).eq('coach_id', coachId).neq('status', 'pasif').select('id');
    setBusy(false);
    if (error) { setMsg({ ok: false, text: 'Uygulanamadı: ' + error.message }); return; }
    setMsg({ ok: true, text: `${data?.length ?? 0} öğrenciye uygulandı.` });
  }

  return (
    <Section icon={<IconAlarm size={17} />} title="Toplu çalışma hatırlatması"
      desc={`Seçtiğiniz saat ve günler ${activeStudents} aktif öğrencinizin hepsine uygulanır. Tek bir öğrenciyi öğrenci detayından ayrıca değiştirebilirsiniz.`}>
      <div className="space-y-3 px-4 py-3">
        {disabled && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">Çalışma hatırlatması bildirimi yukarıda kapalı; saatler kaydedilir ama bildirim gitmez.</p>
        )}
        <div>
          <div className="mb-1.5 text-[12.5px] font-medium text-[var(--ink)]">Saatler</div>
          <div className="flex flex-wrap items-center gap-2">
            {times.map((t, i) => (
              <span key={i} className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-white py-0.5 pl-2 pr-1">
                <input type="time" value={t} step={300} onChange={(e) => setTimes((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                  className="text-[13px] outline-none" />
                <button type="button" onClick={() => setTimes((p) => p.filter((_, j) => j !== i))}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Saati kaldır"><IconX size={14} /></button>
              </span>
            ))}
            {times.length < 3 && (
              <button type="button" onClick={() => setTimes((p) => [...p, p.length ? '22:00' : '20:00'])}
                className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1.5 text-[12.5px] text-gray-600 hover:border-gray-400 hover:text-gray-900">
                <IconPlus size={14} /> Saat ekle
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[12.5px] font-medium text-[var(--ink)]">Günler</div>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((label, d) => {
              const on = days.includes(d);
              return (
                <button key={d} type="button" aria-pressed={on}
                  onClick={() => setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()))}
                  className={`w-11 rounded-lg border py-1.5 text-[12.5px] font-medium transition-colors ${on
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{label}</button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || activeStudents === 0} onClick={() => apply()}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
            {busy ? 'Uygulanıyor…' : 'Tüm öğrencilerime uygula'}
          </button>
          <button type="button" disabled={busy || activeStudents === 0} onClick={() => apply(true)}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-[12.5px] text-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-50">
            Hepsinin hatırlatmasını kapat
          </button>
          {msg && <span className={`text-[12.5px] ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</span>}
        </div>
      </div>
    </Section>
  );
}
