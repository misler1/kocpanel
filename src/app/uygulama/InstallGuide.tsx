'use client';

import { useEffect, useState } from 'react';
import { isAndroid, isIOS, isStandalone } from '@/lib/push-client';

type Platform = 'ios' | 'android' | 'desktop';
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const TABS: { id: Platform; label: string }[] = [
  { id: 'ios', label: 'iPhone / iPad' },
  { id: 'android', label: 'Android' },
  { id: 'desktop', label: 'Bilgisayar' },
];

const STEPS: Record<Platform, { title: string; text: string }[]> = {
  ios: [
    { title: 'Safari’de aç', text: 'www.kocdefterim.com.tr adresini Safari ile aç. Instagram ya da WhatsApp içinden açtıysan sağ alttaki pusula simgesiyle Safari’ye geç.' },
    { title: 'Paylaş düğmesine dokun', text: 'Ekranın altındaki (iPad’de üstteki) kare ve yukarı ok simgesine dokun.' },
    { title: '“Ana Ekrana Ekle”yi seç', text: 'Listeyi biraz aşağı kaydır, “Ana Ekrana Ekle”ye dokun, sağ üstteki “Ekle” ile onayla.' },
    { title: 'Ana ekrandan aç', text: 'KoçDefterim artık diğer uygulamalarının yanında. Bundan sonra hep bu ikondan aç; bildirimler yalnızca böyle çalışır.' },
  ],
  android: [
    { title: 'Chrome’da aç', text: 'www.kocdefterim.com.tr adresini Chrome ile aç.' },
    { title: 'Menüyü aç', text: 'Sağ üstteki üç noktaya dokun.' },
    { title: '“Uygulamayı yükle”yi seç', text: 'Bazı telefonlarda bu seçenek “Ana ekrana ekle” adıyla görünür. Çıkan pencerede “Yükle”ye dokun.' },
    { title: 'Uygulama listesinden aç', text: 'KoçDefterim artık ana ekranında ve uygulama listende.' },
  ],
  desktop: [
    { title: 'Chrome ya da Edge’de aç', text: 'www.kocdefterim.com.tr adresini Chrome veya Microsoft Edge ile aç.' },
    { title: 'Yükle simgesine tıkla', text: 'Adres çubuğunun sağındaki “Uygulamayı yükle” simgesine (ekran ve aşağı ok) tıkla.' },
    { title: 'Masaüstünden aç', text: 'KoçDefterim kendi penceresinde açılır; görev çubuğuna sabitleyebilirsin.' },
  ],
};

export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>('ios');
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    // Sayfa sunucuda platform bilinmeden çizilir; tarayıcıda telefona uygun sekme seçilir
    const t = setTimeout(() => {
      setPlatform(isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop');
      setInstalled(isStandalone());
    }, 0);
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <div className="rounded-3xl border border-[#D9D2C2] bg-white p-5 md:p-7">
      {installed ? (
        <p className="mb-5 rounded-2xl bg-[#E8F7F5] px-4 py-3 text-[15px] font-semibold text-[#008F8B]">
          ✓ KoçDefterim bu cihazda uygulama olarak açık. Aşağıdan bildirimleri açmayı unutma.
        </p>
      ) : prompt ? (
        <button type="button" onClick={install}
          className="mb-5 w-full rounded-2xl bg-[#1D2B3A] px-5 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#2C3E50]">
          📲 Tek dokunuşla yükle
        </button>
      ) : null}

      <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-[#F3EFE6] p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={platform === t.id} onClick={() => setPlatform(t.id)}
            className={`rounded-xl px-2 py-2.5 text-[13.5px] font-semibold transition-colors ${platform === t.id ? 'bg-white text-[#1D2B3A] shadow-sm' : 'text-[#6B6558] hover:text-[#1D2B3A]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <ol className="space-y-3">
        {STEPS[platform].map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-2xl border border-[#EAE4D6] p-4">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#E8F7F5] text-[14px] font-semibold text-[#008F8B]">{i + 1}</span>
            <span>
              <span className="block text-[15.5px] font-semibold text-[#1D2B3A]">{s.title}</span>
              <span className="mt-0.5 block text-[14.5px] leading-relaxed text-[#4A4438]">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
