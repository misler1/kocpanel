'use client';

import { useEffect, useState } from 'react';
import { isAndroid, isIOS, isStandalone } from '@/lib/push-client';
import {
  AndroidChrome, AndroidDialog, AndroidMenu, DesktopBrowser, HomeScreen, IosAddDialog, IosSafari, IosShareSheet,
} from './InstallVisuals';

type Platform = 'ios' | 'android' | 'desktop';
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const TABS: { id: Platform; label: string }[] = [
  { id: 'ios', label: 'iPhone / iPad' },
  { id: 'android', label: 'Android' },
  { id: 'desktop', label: 'Bilgisayar' },
];

const STEPS: Record<Platform, { title: string; text: string; visual?: React.ReactNode }[]> = {
  ios: [
    { title: 'Safari’de Paylaş’a dokun', text: 'Bu sayfayı Safari ile açtığından emin ol. Ekranın altındaki (iPad’de üstteki) kare ve yukarı ok simgesine dokun.', visual: <IosSafari /> },
    { title: '“Ana Ekrana Ekle”yi seç', text: 'Açılan listeyi biraz yukarı kaydır, “Ana Ekrana Ekle”ye dokun.', visual: <IosShareSheet /> },
    { title: '“Ekle”ye dokun', text: 'Sağ üstteki “Ekle” ile onayla. Adı değiştirmene gerek yok.', visual: <IosAddDialog /> },
    { title: 'Ana ekrandan aç', text: 'KoçDefterim artık diğer uygulamalarının yanında. Hep bu ikondan aç; bildirimler yalnızca böyle çalışır.', visual: <HomeScreen /> },
  ],
  android: [
    { title: 'Chrome’da menüyü aç', text: 'Bu sayfayı Chrome ile aç ve sağ üstteki üç noktaya dokun.', visual: <AndroidChrome /> },
    { title: '“Uygulamayı yükle”yi seç', text: 'Bazı telefonlarda bu seçenek “Ana ekrana ekle” adıyla görünür.', visual: <AndroidMenu /> },
    { title: '“Yükle”ye dokun', text: 'Çıkan pencerede “Yükle”yi seç. Birkaç saniye içinde hazır.', visual: <AndroidDialog /> },
    { title: 'Ana ekrandan aç', text: 'KoçDefterim artık ana ekranında ve uygulama listende.', visual: <HomeScreen /> },
  ],
  desktop: [
    { title: 'Yükle simgesine tıkla', text: 'Chrome ya da Microsoft Edge’de adres çubuğunun sağındaki “Uygulamayı yükle” simgesine tıkla, sonra “Yükle”yi seç.', visual: <DesktopBrowser /> },
    { title: 'Masaüstünden aç', text: 'KoçDefterim kendi penceresinde açılır. İstersen görev çubuğuna sabitle.' },
  ],
};

/** Google, Instagram, Facebook, TikTok gibi uygulamaların içindeki tarayıcı: buradan ana ekrana eklenemez */
function inAppBrowser() {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/GSA\//.test(ua)) return 'Google';
  if (/Instagram/.test(ua)) return 'Instagram';
  if (/FBAN|FBAV/.test(ua)) return 'Facebook';
  if (/musical_ly|TikTok|BytedanceWebview/.test(ua)) return 'TikTok';
  return null;
}

export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>('ios');
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [inApp, setInApp] = useState<string | null>(null);

  useEffect(() => {
    // Sayfa sunucuda platform bilinmeden çizilir; tarayıcıda telefona uygun sekme seçilir
    const t = setTimeout(() => {
      setPlatform(isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop');
      setInstalled(isStandalone());
      setInApp(inAppBrowser());
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
      {inApp && !installed && (
        <div className="mb-5 rounded-2xl border border-[#F0B36A] bg-[#FFF7EB] px-4 py-3 text-[14.5px] leading-relaxed text-[#7A4A12]">
          <b>Önce bu sayfayı {platform === 'android' ? 'Chrome' : 'Safari'}’de aç.</b> Şu an {inApp} uygulamasının içindesin; buradan
          ana ekrana eklenemiyor. {platform === 'android'
            ? 'Sağ üstteki üç noktaya dokunup “Tarayıcıda aç”ı seç.'
            : 'Ekrandaki paylaş ya da üç nokta menüsünden “Safari’de Aç”ı seç.'}
        </div>
      )}

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

      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS[platform].map((s, i) => (
          <li key={s.title} className="flex flex-col rounded-2xl border border-[#EAE4D6] bg-[#FDFCF9] p-4">
            {s.visual && <div className="mb-4 flex justify-center">{s.visual}</div>}
            <div className="flex gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#E8F7F5] text-[14px] font-semibold text-[#008F8B]">{i + 1}</span>
              <span>
                <span className="block text-[15.5px] font-semibold text-[#1D2B3A]">{s.title}</span>
                <span className="mt-0.5 block text-[14px] leading-relaxed text-[#4A4438]">{s.text}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
