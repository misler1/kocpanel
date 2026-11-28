'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { IconMessageReport, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

// "Bize bildir": gördüğü sorunu, önerisini ya da iletmek istediğini yöneticiye gönderir (supabase/geri_bildirim.sql).
// Hangi sayfada olduğu ve cihaz/tarayıcı bilgisi kendiliğinden eklenir.

const KINDS = [
  { id: 'sorun', label: '⚠️ Sorun', hint: 'Ne yaparken oldu, ne bekliyordunuz, ne oldu?' },
  { id: 'oneri', label: '💡 Öneri', hint: 'Neyin olmasını ya da değişmesini istersiniz?' },
  { id: 'diger', label: '✉️ Diğer', hint: 'İletmek istediğinizi yazın.' },
] as const;

export function FeedbackButton({ className = '', label = 'Bize bildir' }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('sorun');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  function show() { setOpen(true); setDone(false); setError(null); }

  async function send() {
    if (!text.trim()) { setError('Lütfen birkaç kelime yazın.'); return; }
    setBusy(true); setError(null);
    const { error: err } = await (createClient() as any).from('feedback_reports').insert({
      kind, message: text.trim().slice(0, 4000),
      page: (window.location.pathname + window.location.search).slice(0, 300),
      user_agent: navigator.userAgent.slice(0, 400),
    });
    setBusy(false);
    if (err) {
      setError(/feedback_reports|schema cache|does not exist/i.test(err.message)
        ? 'Bildirim sistemi henüz kurulmadı (geri_bildirim.sql).'
        : `Gönderilemedi: ${err.message}`);
      return;
    }
    setText(''); setDone(true);
  }

  const current = KINDS.find((k) => k.id === kind)!;

  return (
    <>
      <button type="button" onClick={show} className={className}>
        <IconMessageReport size={15} /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-[var(--card)] p-5 text-[var(--ink)] shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Bize bildir">
            <div className="mb-3 flex items-center gap-2">
              <IconMessageReport size={20} className="text-[var(--accent)]" />
              <h2 className="flex-1 text-[16px] font-semibold">Bize bildir</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--paper)]"><IconX size={18} /></button>
            </div>
            {done ? (
              <div className="py-4 text-center">
                <p className="text-[28px]">🙏</p>
                <p className="mt-1 text-[14px] font-semibold">Teşekkürler, iletildi!</p>
                <p className="mt-1 text-[12.5px] text-[var(--ink-muted)]">İnceleyip ele aldığımızda size bildirim gelecek.</p>
                <button type="button" onClick={() => setOpen(false)} className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white">Kapat</button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex gap-1.5">
                  {KINDS.map((k) => (
                    <button key={k.id} type="button" onClick={() => setKind(k.id)}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-[13px] font-medium ${kind === k.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-dark)]' : 'border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--paper)]'}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={4000} autoFocus
                  placeholder={current.hint}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--accent)]" />
                <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">Bulunduğunuz sayfa ve cihaz bilgisi de eklenir; sorunu bulmamıza yardım eder.</p>
                {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
                <button type="button" onClick={send} disabled={busy}
                  className="mt-3 w-full rounded-lg bg-[var(--accent)] py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60">
                  {busy ? 'Gönderiliyor…' : 'Gönder'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
