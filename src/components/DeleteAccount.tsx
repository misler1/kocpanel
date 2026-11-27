'use client';

import { useState } from 'react';
import { IconTrash, IconAlertTriangle, IconX } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

// "Hesabımı sil": onay için "Sil" yazılır. Silme /api/hesap/sil'de yapılır (rol kuralları orada).
const TEXT: Record<'staff' | 'student' | 'parent', string[]> = {
  staff: [
    'Giriş hesabınız ve profiliniz kalıcı olarak silinir.',
    'Size bağlı tüm öğrenciler ve kayıtları (görüşmeler, denemeler, programlar, günlükler, mesajlar) silinir; öğrencilerin ve velilerin giriş hesapları da kapanır.',
    'Stajyer koçsanız öğrencileriniz silinmez, rehber öğretmeninize aktarılır.',
    'Bu işlem geri alınamaz.',
  ],
  student: [
    'Giriş hesabın kalıcı olarak silinir; bir daha bu hesapla giriş yapamazsın.',
    'Koçundaki öğrenci kaydın (program, denemeler, görüşmeler) silinmez; koçun yeniden hesap açabilir.',
    'Bu işlem geri alınamaz.',
  ],
  parent: [
    'Veli giriş hesabınız kalıcı olarak silinir.',
    'Öğrencinizin koçtaki kayıtları silinmez.',
    'Bu işlem geri alınamaz.',
  ],
};

export function DeleteAccount({ kind, className = '' }: { kind: 'staff' | 'student' | 'parent'; className?: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ok = confirm.trim().toLocaleLowerCase('tr') === 'sil';

  async function remove() {
    if (!ok) return;
    setBusy(true); setError(null);
    const res = await fetch('/api/hesap/sil', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setBusy(false); setError(json.error ?? 'Hesap silinemedi, tekrar deneyin.'); return; }
    await createClient().auth.signOut().catch(() => {});
    window.location.href = '/';
  }

  return (
    <div className={className}>
      <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--card)] px-5 py-4">
        <p className="text-sm font-semibold text-[var(--ink)]">Hesabı sil</p>
        <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)]">Hesabınızı ve {kind === 'staff' ? 'size bağlı öğrencilerin verilerini' : 'giriş bilginizi'} kalıcı olarak siler.</p>
        <button type="button" onClick={() => { setOpen(true); setConfirm(''); setError(null); }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/40 px-3 py-1.5 text-[13px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]">
          <IconTrash size={15} /> Hesabımı sil
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
                <IconAlertTriangle size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-[var(--ink)]">Hesabınız silinsin mi?</h3>
              </div>
              <button type="button" onClick={() => !busy && setOpen(false)} aria-label="Kapat" className="text-[var(--ink-muted)] hover:text-[var(--ink)]">
                <IconX size={18} />
              </button>
            </div>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-[13px] text-[var(--ink)]">
              {TEXT[kind].map((t) => <li key={t} className={t.includes('geri alınamaz') ? 'font-semibold text-[var(--danger)]' : ''}>{t}</li>)}
            </ul>
            <label className="mb-1 block text-[13px] text-[var(--ink)]">Onaylamak için <b>Sil</b> yazın</label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" placeholder="Sil"
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--danger)]" />
            {error && <p className="mt-2 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12.5px] text-[var(--danger)]">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm text-[var(--ink-muted)] hover:bg-[var(--paper)]">Vazgeç</button>
              <button type="button" disabled={!ok || busy} onClick={remove}
                className="flex-1 rounded-lg bg-[var(--danger)] py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
                {busy ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
