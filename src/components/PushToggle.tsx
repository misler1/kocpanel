'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconDeviceMobile, IconBellRinging, IconBellOff } from '@tabler/icons-react';
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/push-client';

function usePushState() {
  const [state, setState] = useState<PushState>('loading');
  useEffect(() => {
    let alive = true;
    getPushState().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);
  return [state, setState] as const;
}

/**
 * Telefon bildirimi aç/kapat.
 * variant="card": Hesabım sayfalarında tüm durumlarıyla; variant="bell": zil menüsünün altında, yalnızca açılabilecekken.
 */
export function PushToggle({ variant = 'card' }: { variant?: 'card' | 'bell' }) {
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function turnOn() {
    setBusy(true);
    setError('');
    try {
      setState(await enablePush());
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

  if (variant === 'bell') {
    if (state === 'off') {
      return (
        <button type="button" onClick={turnOn} disabled={busy}
          className="flex w-full items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-[13px] font-bold text-[var(--accent-dark)] transition-colors hover:bg-[var(--accent-soft)]/70 disabled:opacity-60">
          <IconBellRinging size={16} /> {busy ? 'Açılıyor…' : 'Bildirimler telefonuma da gelsin'}
        </button>
      );
    }
    if (state === 'ios-install') {
      return (
        <Link href="/uygulama"
          className="flex w-full items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--accent-soft)] px-4 py-3 text-[12.5px] font-bold text-[var(--accent-dark)] hover:underline">
          <IconDeviceMobile size={16} /> Telefona bildirim için uygulamayı ana ekrana ekleyin
        </Link>
      );
    }
    return null;
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
