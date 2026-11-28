'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import { IconMessageReport, IconX, IconPhotoPlus, IconLoader2 } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { shrink } from '@/components/meeting/MeetingPhotos';

// "Bize bildir": gördüğü sorunu, önerisini ya da iletmek istediğini yöneticiye gönderir (supabase/geri_bildirim.sql).
// Hangi sayfada olduğu ve cihaz/tarayıcı bilgisi kendiliğinden eklenir. En fazla 3 fotoğraf / ekran görüntüsü
// eklenebilir (supabase/geri_bildirim_foto.sql, /api/geri-bildirim/foto).

const KINDS = [
  { id: 'sorun', label: '⚠️ Sorun', hint: 'Ne yaparken oldu, ne bekliyordunuz, ne oldu?' },
  { id: 'oneri', label: '💡 Öneri', hint: 'Neyin olmasını ya da değişmesini istersiniz?' },
  { id: 'diger', label: '✉️ Diğer', hint: 'İletmek istediğinizi yazın.' },
] as const;

const MAX_PHOTOS = 3;
export const feedbackPhotoUrl = (p: string) => `/api/geri-bildirim/foto?path=${encodeURIComponent(p)}`;

export function FeedbackButton({ className = '', label = 'Bize bildir' }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('sorun');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<string[]>([]);
  useEffect(() => { photosRef.current = photos; }, [photos]);

  // Gönderilmeden kapatılırsa yüklenen fotoğraflar depodan silinir
  function close() {
    if (busy) return;
    for (const p of photosRef.current) fetch(feedbackPhotoUrl(p), { method: 'DELETE', keepalive: true }).catch(() => {});
    setPhotos([]);
    setOpen(false);
  }
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function show() { setOpen(true); setDone(false); setError(null); }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    let cur = photosRef.current;
    for (const f of Array.from(files).slice(0, Math.max(0, MAX_PHOTOS - cur.length))) {
      setUploading((n) => n + 1);
      try {
        const blob = await shrink(f);
        if (!blob) { setError('Bu fotoğraf açılamadı ya da çok büyük. JPG ya da PNG deneyin.'); continue; }
        const fd = new FormData();
        fd.append('file', blob, 'foto.jpg');
        const res = await fetch('/api/geri-bildirim/foto', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) setError(j.error ?? 'Fotoğraf yüklenemedi.');
        else { cur = [...cur, j.path]; photosRef.current = cur; setPhotos(cur); }
      } catch {
        setError('Fotoğraf yüklenemedi (bağlantıyı kontrol edin).');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  function removePhoto(p: string) {
    setPhotos((x) => x.filter((y) => y !== p));
    fetch(feedbackPhotoUrl(p), { method: 'DELETE' }).catch(() => {});
  }

  async function send() {
    if (!text.trim()) { setError('Lütfen birkaç kelime yazın.'); return; }
    if (uploading) { setError('Fotoğraf yükleniyor, birkaç saniye bekleyin.'); return; }
    setBusy(true); setError(null);
    const { error: err } = await (createClient() as any).from('feedback_reports').insert({
      kind, message: text.trim().slice(0, 4000),
      page: (window.location.pathname + window.location.search).slice(0, 300),
      user_agent: navigator.userAgent.slice(0, 400),
      ...(photos.length ? { photos } : {}),
    });
    setBusy(false);
    if (err) {
      setError(/feedback_reports|schema cache|does not exist/i.test(err.message)
        ? (photos.length && /photos/i.test(err.message) ? 'Fotoğraf eklentisi henüz kurulmadı (geri_bildirim_foto.sql); fotoğrafsız gönderin.' : 'Bildirim sistemi henüz kurulmadı (geri_bildirim.sql).')
        : `Gönderilemedi: ${err.message}`);
      return;
    }
    photosRef.current = [];
    setText(''); setPhotos([]); setDone(true);
  }

  const current = KINDS.find((k) => k.id === kind)!;

  return (
    <>
      <button type="button" onClick={show} className={className}>
        <IconMessageReport size={15} /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={close}>
          <div className="w-full max-w-md rounded-t-2xl bg-[var(--card)] p-5 text-[var(--ink)] shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Bize bildir">
            <div className="mb-3 flex items-center gap-2">
              <IconMessageReport size={20} className="text-[var(--accent)]" />
              <h2 className="flex-1 text-[16px] font-semibold">Bize bildir</h2>
              <button type="button" onClick={close} aria-label="Kapat" className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--paper)]"><IconX size={18} /></button>
            </div>
            {done ? (
              <div className="py-4 text-center">
                <p className="text-[28px]">🙏</p>
                <p className="mt-1 text-[14px] font-semibold">Teşekkürler, iletildi!</p>
                <p className="mt-1 text-[12.5px] text-[var(--ink-muted)]">İnceleyip ele aldığımızda size bildirim gelecek.</p>
                <button type="button" onClick={close} className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white">Kapat</button>
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

                {/* Fotoğraf / ekran görüntüsü */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {photos.map((p) => (
                    <div key={p} className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--paper)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={feedbackPhotoUrl(p)} alt="Eklenen fotoğraf" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removePhoto(p)} aria-label="Fotoğrafı kaldır"
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><IconX size={12} /></button>
                    </div>
                  ))}
                  {uploading > 0 && (
                    <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-[var(--ink-muted)]">
                      <IconLoader2 size={18} className="animate-spin" />
                    </span>
                  )}
                  {photos.length + uploading < MAX_PHOTOS && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-[12.5px] font-medium text-[var(--ink-muted)] hover:bg-[var(--paper)]">
                      <IconPhotoPlus size={16} /> Fotoğraf / ekran görüntüsü ekle
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                </div>

                <p className="mt-1.5 text-[11.5px] text-[var(--ink-muted)]">En fazla {MAX_PHOTOS} fotoğraf. Bulunduğunuz sayfa ve cihaz bilgisi de eklenir; sorunu bulmamıza yardım eder.</p>
                {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
                <button type="button" onClick={send} disabled={busy || uploading > 0}
                  className="mt-3 w-full rounded-lg bg-[var(--accent)] py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-60">
                  {busy ? 'Gönderiliyor…' : uploading ? 'Fotoğraf yükleniyor…' : 'Gönder'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
