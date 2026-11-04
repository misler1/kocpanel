import { IconBellRinging, IconCheck, IconMessageCircle, IconTrendingUp } from '@tabler/icons-react';

// Ana sayfa görseli: öğrencinin telefondaki "Bugünün görevleri" ekranı ve çevresinde uygulamanın üç işi
// (çalışma hatırlatması, koç mesajı, haftalık ilerleme). Örnek içerik; gerçek bir öğrenciye ait değildir.

const TASKS = [
  { subject: 'TYT Matematik', detail: 'Problemler · 40 soru', done: true, color: 'bg-navy-500' },
  { subject: 'Paragraf', detail: '30 soru', done: true, color: 'bg-orange-500' },
  { subject: 'AYT Fizik', detail: 'Kuvvet ve hareket · 25 soru', done: false, color: 'bg-aqua-500' },
  { subject: 'Deneme analizi', detail: 'Yanlışları not et', done: false, color: 'bg-emerald-500' },
];

const WEEK = [
  { d: 'Pzt', h: 90 }, { d: 'Sal', h: 100 }, { d: 'Çar', h: 70 }, { d: 'Per', h: 85 },
  { d: 'Cum', h: 60 }, { d: 'Cmt', h: 95 }, { d: 'Paz', h: 40 },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[300px] sm:max-w-[520px]" aria-hidden="true">
      {/* Arka plan lekeleri */}
      <div className="absolute left-6 top-10 h-64 w-64 rounded-full bg-navy-400/30 blur-3xl" />
      <div className="absolute bottom-6 right-0 h-72 w-72 rounded-full bg-aqua-400/25 blur-3xl" />
      <div className="absolute right-16 top-0 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />

      {/* Telefon */}
      <div className="absolute left-1/2 top-2 w-[262px] -translate-x-1/2 rounded-[42px] sm:left-auto sm:right-4 sm:translate-x-0 border-[9px] border-gray-900 bg-gray-900 shadow-[0_40px_80px_-30px_rgba(30,41,59,0.55)] sm:rotate-[-3deg]">
        <div className="overflow-hidden rounded-[33px] bg-[#F7F5FF]">
          <div className="relative flex justify-center pt-2">
            <div className="h-5 w-24 rounded-full bg-gray-900" />
          </div>
          <div className="bg-gradient-to-br from-navy-600 via-navy-500 to-aqua-500 px-4 pb-5 pt-4 text-white">
            <div className="text-[11px] font-medium text-white/80">Perşembe</div>
            <div className="text-[17px] font-extrabold leading-tight">Bugünün görevleri 🎯</div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold">
              <span>Harika gidiyorsun!</span>
              <span>2/4 görev</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/30">
              <div className="h-full w-1/2 rounded-full bg-white" />
            </div>
          </div>
          <div className="-mt-2 space-y-2 rounded-t-2xl bg-[#F7F5FF] px-3 pb-5 pt-3">
            {TASKS.map((t) => (
              <div key={t.subject} className="flex items-center gap-2.5 rounded-2xl bg-white px-2.5 py-2 shadow-sm">
                <span className={`h-8 w-1.5 flex-shrink-0 rounded-full ${t.color}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[12px] font-bold ${t.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.subject}</span>
                  <span className="block truncate text-[10.5px] text-gray-500">{t.detail}</span>
                </span>
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${t.done ? 'bg-emerald-500 text-white' : 'border-2 border-gray-200'}`}>
                  {t.done && <IconCheck size={14} stroke={3} />}
                </span>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-dashed border-aqua-200 py-2 text-center text-[11px] font-bold text-aqua-500">
              + Bugün ne çalıştın?
            </div>
          </div>
        </div>
      </div>

      {/* Bildirim */}
      <div className="absolute left-0 top-8 hidden w-[225px] rounded-2xl border border-white/60 bg-white/95 p-3 shadow-xl backdrop-blur sm:block">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-400 to-aqua-600 text-white">
            <IconBellRinging size={18} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center justify-between text-[10.5px] text-gray-400">KoçDefterim <span>şimdi</span></span>
            <span className="block text-[12.5px] font-bold text-gray-900">Günlüğünü doldurma zamanı 📒</span>
            <span className="block text-[11px] leading-snug text-gray-500">Bugünkü 2 görevin henüz işaretlenmedi.</span>
          </span>
        </div>
      </div>

      {/* Koç mesajı */}
      <div className="absolute bottom-10 left-0 hidden w-[215px] rounded-2xl bg-white p-3 shadow-xl sm:block">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-navy-600">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-100"><IconMessageCircle size={14} /></span>
          Koçundan mesaj
        </div>
        <p className="text-[12px] leading-snug text-gray-700">Paragrafta çok iyi ilerliyorsun 👏 Cumartesi denemeden sonra konuşalım.</p>
      </div>

      {/* Haftalık ilerleme */}
      <div className="absolute left-6 top-[188px] hidden w-[195px] rounded-2xl bg-white p-3.5 shadow-xl sm:block">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-gray-500">Bu hafta</span>
          <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-600">
            <IconTrendingUp size={12} /> %78
          </span>
        </div>
        <div className="mt-2.5 flex h-16 items-end justify-between gap-1.5">
          {WEEK.map((w) => (
            <span key={w.d} className="flex flex-1 flex-col items-center gap-1">
              <span className="w-full rounded-md bg-gradient-to-t from-navy-500 to-aqua-400" style={{ height: `${w.h * 0.48}px` }} />
              <span className="text-[9px] font-medium text-gray-400">{w.d}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
