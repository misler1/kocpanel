'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBrandAndroid, IconBrandAppleFilled, IconDeviceLaptop } from '@tabler/icons-react';
import { isAndroid, isIOS, isStandalone } from '@/lib/push-client';
import {
  AndroidChrome, AndroidDialog, AndroidMenu, DesktopBrowser, HomeScreen, IosAddDialog, IosSafari, IosShareSheet,
} from './InstallVisuals';

type Platform = 'ios' | 'android' | 'desktop';
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const TABS: { id: Platform; label: string; icon: React.ReactNode }[] = [
  { id: 'ios', label: 'iPhone / iPad', icon: <IconBrandAppleFilled size={17} className="text-[#1D2B3A]" /> },
  { id: 'android', label: 'Android', icon: <IconBrandAndroid size={17} className="text-[#2BB673]" /> },
  { id: 'desktop', label: 'Bilgisayar', icon: <IconDeviceLaptop size={17} className="text-[#3B7DD8]" /> },
];

// Sekmeler JavaScript'e bağlı değildir: seçim gizli radyo düğmelerinde tutulur, görünüm CSS (:has) ile değişir.
// Böylece sayfanın betikleri geç yüklense ya da hiç çalışmasa da sekmeler çalışır.
const TAB_ON: Record<Platform, string> = {
  ios: 'group-has-[#kurulum-ios:checked]:bg-white group-has-[#kurulum-ios:checked]:text-[#1D2B3A] group-has-[#kurulum-ios:checked]:shadow-sm',
  android: 'group-has-[#kurulum-android:checked]:bg-white group-has-[#kurulum-android:checked]:text-[#1D2B3A] group-has-[#kurulum-android:checked]:shadow-sm',
  desktop: 'group-has-[#kurulum-desktop:checked]:bg-white group-has-[#kurulum-desktop:checked]:text-[#1D2B3A] group-has-[#kurulum-desktop:checked]:shadow-sm',
};
const PANEL_ON: Record<Platform, string> = {
  ios: 'group-has-[#kurulum-ios:checked]:grid',
  android: 'group-has-[#kurulum-android:checked]:grid',
  desktop: 'group-has-[#kurulum-desktop:checked]:grid',
};

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
  const chosen = useRef(false);
  const [detected, setDetected] = useState<Platform>('ios'); // ziyaretçinin kendi cihazı
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [inApp, setInApp] = useState<string | null>(null);

  useEffect(() => {
    // Sayfa sunucuda platform bilinmeden çizilir; tarayıcıda telefona uygun sekme seçilir
    const t = setTimeout(() => {
      const mine: Platform = isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop';
      setDetected(mine);
      // Ziyaretçi bu arada bir cihaz seçtiyse onun seçimi korunur
      const radio = document.getElementById(`kurulum-${mine}`) as HTMLInputElement | null;
      if (radio && !chosen.current) radio.checked = true;
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
          <b>Önce bu sayfayı {detected === 'android' ? 'Chrome' : 'Safari'}’de aç.</b> Şu an {inApp} uygulamasının içindesin; buradan
          ana ekrana eklenemiyor. {detected === 'android'
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

      <div className="group">
        {TABS.map((t) => (
          <input key={t.id} type="radio" name="kurulum" id={`kurulum-${t.id}`} defaultChecked={t.id === 'ios'}
            onChange={() => { chosen.current = true; }} className="sr-only" />
        ))}
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-[#F3EFE6] p-1">
          {TABS.map((t) => (
            <label key={t.id} htmlFor={`kurulum-${t.id}`}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 py-2.5 text-center text-[12.5px] font-semibold text-[#6B6558] transition-colors hover:text-[#1D2B3A] sm:flex-row sm:gap-1.5 sm:px-2 sm:text-[13.5px] ${TAB_ON[t.id]}`}>
              {t.icon}
              {t.label}
            </label>
          ))}
        </div>

        {TABS.map((t) => (
          <ol key={t.id} className={`hidden gap-3 sm:grid-cols-2 ${PANEL_ON[t.id]}`}>
            {STEPS[t.id].map((s, i) => (
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
        ))}
      </div>
    </div>
  );
}
