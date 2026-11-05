'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconDeviceMobile, IconBellRinging, IconBellOff, IconX } from '@tabler/icons-react';
import { disablePush, enablePush, getPushState, isAndroid, isIOS, type PushState } from '@/lib/push-client';

// Zil/ana sayfa kartı "Şimdi değil" denince ya da izin penceresi kapatılınca bir süre gösterilmez
// (Hesabım sayfasındaki ayar her zaman görünür).
const DISMISS_KEY = 'kd-push-prompt-dismissed';
const DISMISS_DAYS = 30;

function promptDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function dismissPrompt() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* depolama kapalı */ }
}

function usePushState() {
  const [state, setState] = useState<PushState>('loading');
  const [dismissed, setDismissed] = useState(true);
  const [mobile, setMobile] = useState(true);
  useEffect(() => {
    let alive = true;
    // Tarayıcıya özgü bilgiler yalnızca istemcide okunur
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(promptDismissed());
    setMobile(isIOS() || isAndroid());
    getPushState().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);
  return { state, setState, dismissed, setDismissed, mobile };
}

/**
 * Telefon bildirimi aç/kapat.
 * variant="card": Hesabım sayfalarında tüm durumlarıyla. variant="bell" (zil menüsünün üstü) ve "banner" (öğrenci ana sayfası):
 * yalnızca bildirim açılabilecekken görünen, dikkat çeken kart.
 */
export function PushToggle({ variant = 'card' }: { variant?: 'card' | 'bell' | 'banner' }) {
  const { state, setState, dismissed, setDismissed, mobile } = usePushState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function turnOn() {
    setBusy(true);
    setError('');
    try {
      const next = await enablePush();
      setState(next);
      // İzin penceresi kapatıldı ya da tarayıcı sessizce engelledi: kart bir süre tekrar sormasın
      if (next !== 'on' && variant !== 'card') { dismissPrompt(); setDismissed(true); }
    } catch {
      setError('Bildirimler açılamadı, biraz sonra tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setState(await disablePush());
    setBusy(false);
  }

  if (variant === 'bell' || variant === 'banner') {
    // Yalnızca açılabilecekken görünür; açılınca kaybolur
    if ((state !== 'off' && state !== 'ios-install') || dismissed) return null;
    const banner = variant === 'banner';
    const title = mobile ? 'Bildirimleri telefonuna aç' : 'Bildirimleri bu cihazda aç';
    const body = state === 'off'
      ? `Mesajlar ve yeni gelişmeler ${mobile ? 'telefonuna' : 'bu cihaza'} bildirim olarak gelsin.`
      : 'iPhone’da bildirim almak için önce uygulamayı ana ekrana ekle, sonra oradan aç.';
    const later = () => { dismissPrompt(); setDismissed(true); };
    return (
      <div className={`bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white ${banner
        ? 'flex flex-col gap-3 rounded-[28px] p-4 shadow-[0_8px_24px_rgba(139,92,246,0.25)] sm:flex-row sm:items-center md:p-5'
        : 'flex flex-col gap-2.5 border-b border-[var(--border)] px-4 py-3.5'}`}>
        <div className="flex items-start gap-3">
          <span className={`flex flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 ${banner ? 'h-11 w-11' : 'h-9 w-9'}`}>
            <IconBellRinging size={banner ? 22 : 19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block font-extrabold leading-snug ${banner ? 'text-[16px]' : 'text-[14px]'}`}>{title}</span>
            <span className={`mt-0.5 block leading-snug text-white/90 ${banner ? 'text-[13.5px]' : 'text-[12.5px]'}`}>{body}</span>
          </span>
          <button type="button" onClick={later} aria-label="Şimdi değil" title="Şimdi değil"
            className="-mr-1 -mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white">
            <IconX size={16} />
          </button>
        </div>
        {state === 'off' ? (
          <button type="button" onClick={turnOn} disabled={busy}
            className={`flex flex-shrink-0 items-center justify-center gap-1.5 rounded-full bg-white font-extrabold text-[#7C3AED] shadow-sm transition-transform active:scale-95 disabled:opacity-70 ${banner ? 'px-5 py-2.5 text-[14.5px] sm:ml-auto' : 'py-2 text-[13.5px]'}`}>
            <IconBellRinging size={16} /> {busy ? 'Açılıyor…' : 'Bildirimleri aç'}
          </button>
        ) : (
          <Link href="/uygulama"
            className={`flex flex-shrink-0 items-center justify-center gap-1.5 rounded-full bg-white font-extrabold text-[#7C3AED] shadow-sm ${banner ? 'px-5 py-2.5 text-[14.5px] sm:ml-auto' : 'py-2 text-[13.5px]'}`}>
            <IconDeviceMobile size={16} /> Nasıl eklenir?
          </Link>
        )}
        {error && <span className="text-[12.5px] font-semibold text-white">{error}</span>}
      </div>
    );
  }

  const text: Record<PushState, string> = {
    loading: 'Kontrol ediliyor…',
    unsupported: 'Bu tarayıcı telefon bildirimlerini desteklemiyor. Telefonunuzda Chrome (Android) ya da ana ekrana eklenmiş uygulama (iPhone) ile açın.',
    'ios-install': 'iPhone ve iPad’de bildirimler yalnızca ana ekrana eklenmiş uygulamada çalışır. Önce uygulamayı ana ekrana ekleyin, sonra oradan açıp bu düğmeye dokunun.',
    denied: 'Bu cihazda bildirim izni kapalı. Telefon ayarlarından KoçDefterim (ya da tarayıcı) için bildirimlere izin verin, sonra bu sayfayı yenileyin.',
    off: 'Yeni görüşme, mesaj ve program değişikliklerinde telefonunuza bildirim gelsin.',
    on: 'Bu cihazda bildirimler açık ✓',
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-5">
      <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
        <IconDeviceMobile size={18} className="text-[var(--accent)]" /> Telefon bildirimleri
      </div>
      <p className="text-[13.5px] leading-relaxed text-[var(--ink-muted)]">{text[state]}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {state === 'off' && (
          <button type="button" onClick={turnOn} disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-dark)] disabled:opacity-60">
            <IconBellRinging size={16} /> {busy ? 'Açılıyor…' : 'Bildirimleri aç'}
          </button>
        )}
        {state === 'on' && (
          <button type="button" onClick={turnOff} disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)] disabled:opacity-60">
            <IconBellOff size={16} /> Bu cihazda kapat
          </button>
        )}
        <Link href="/uygulama" className="text-[13px] font-semibold text-[var(--accent-dark)] hover:underline">
          Uygulamayı telefona yükleme rehberi →
        </Link>
      </div>
      {error && <p className="mt-2 text-[13px] text-[var(--danger)]">{error}</p>}
    </div>
  );
}
