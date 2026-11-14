'use client';

import { useEffect, useRef, useState } from 'react';
import { IconCamera, IconLoader2, IconTextScan2, IconX } from '@tabler/icons-react';

// Görüşme kaydına defter fotoğrafı (supabase/meeting_photos.sql, /api/gorusme/foto).
// Telefonda kamerayı ya da galeriyi açar; fotoğraf yüklemeden önce küçültülür (yazı okunur kalacak kadar).
// "Yazıyı oku": yapay zekâ el yazısını metne çevirir, metin notlara eklenir (koç kontrol edip düzeltir).

/** Okunan yazıyı notların sonuna ekler */
export const appendReadText = (notes: string, text: string) =>
  notes.trim() ? `${notes.trimEnd()}

📷 Defterden:
${text}` : text;

export const photoUrl = (path: string) => `/api/gorusme/foto?path=${encodeURIComponent(path)}`;

/** Sunucuya giden en büyük dosya (Vercel isteği 4,5 MB'ta keser) */
const MAX_UPLOAD = 4 * 1024 * 1024;

async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Bazı tarayıcılarda createImageBitmap bazı biçimleri açamaz: <img> ile dene
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Fotoğrafı en uzun kenarı 2000 px olacak şekilde JPEG'e çevirir (gerekirse 4 MB altına inene kadar küçültür).
 *  Tarayıcı açamazsa (ör. bilgisayarda HEIC) küçükse olduğu gibi döner, büyükse null. */
async function shrink(file: File): Promise<Blob | null> {
  try {
    const img = await loadImage(file);
    for (const [side, q] of [[2000, 0.85], [1600, 0.8], [1280, 0.75]] as const) {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= MAX_UPLOAD) return blob;
    }
    return null;
  } catch {
    return file.size <= MAX_UPLOAD ? file : null;
  }
}

/** Kayıtlı görüşmede fotoğrafları gösterir (tıklayınca büyük açılır) */
export function MeetingPhotoStrip({ photos }: { photos?: string[] | null }) {
  if (!photos?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p) => (
        <a key={p} href={photoUrl(p)} target="_blank" rel="noopener" title="Fotoğrafı aç"
          className="block h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--paper)] hover:ring-2 hover:ring-[var(--accent)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(p)} alt="Defter fotoğrafı" loading="lazy" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}

export function MeetingPhotos({ studentId, photos, onChange, onReadText, deleteOnRemove = true }: {
  studentId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  /** Okunan yazı (notlara eklenir) */
  onReadText?: (text: string) => void;
  /** Kaldırılan fotoğraf depodan da silinsin mi? (kayıtlı görüşme düzenlenirken vazgeçilebileceği için kapalı) */
  deleteOnRemove?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [reading, setReading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);

  async function add(files: FileList | null) {
    if (!files?.length || !studentId) return;
    setMsg(null);
    let current = photosRef.current;
    for (const f of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const blob = await shrink(f);
        if (!blob) {
          setMsg({ ok: false, text: `${f.name}: bu fotoğraf açılamadı ya da çok büyük. JPG ya da PNG olarak deneyin.` });
          continue;
        }
        const fd = new FormData();
        fd.append('studentId', studentId);
        fd.append('file', blob, f.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/jpeg' ? '.jpg' : ''));
        const res = await fetch('/api/gorusme/foto', { method: 'POST', body: fd });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) setMsg({ ok: false, text: j.error ?? `Fotoğraf yüklenemedi (hata ${res.status}${res.status === 413 ? ': dosya çok büyük' : ''}).` });
        else { current = [...current, j.path]; photosRef.current = current; onChange(current); }
      } catch {
        setMsg({ ok: false, text: 'Fotoğraf yüklenemedi (bağlantıyı kontrol edin).' });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(p: string) {
    onChange(photos.filter((x) => x !== p));
    if (deleteOnRemove) fetch(photoUrl(p), { method: 'DELETE' }).catch(() => {});
  }

  async function read(p: string) {
    setReading(p); setMsg(null);
    const res = await fetch('/api/gorusme/foto/oku', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) })
      .catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setReading(null);
    if (!res?.ok || !j.text) {
      const st = res?.status;
      setMsg({ ok: false, text: j.error ?? (st === 504 ? 'Yazı okuma zaman aşımına uğradı; tekrar deneyin.' : `Yazı okunamadı${st ? ` (hata ${st})` : ' (bağlantı hatası)'}.`) });
      return;
    }
    onReadText?.(j.text);
    setMsg({ ok: true, text: 'Yazı notlara eklendi. Okunamayan yerler [?] ile işaretli; lütfen kontrol edin.' });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start gap-2">
        {photos.map((p) => (
          <div key={p} className="relative w-24">
            <a href={photoUrl(p)} target="_blank" rel="noopener" title="Fotoğrafı aç"
              className="block h-24 w-24 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--paper)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p)} alt="Defter fotoğrafı" className="h-full w-full object-cover" />
            </a>
            <button type="button" onClick={() => remove(p)} aria-label="Fotoğrafı kaldır"
              className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-800 p-0.5 text-white shadow hover:bg-rose-600">
              <IconX size={13} />
            </button>
            {onReadText && (
              <button type="button" onClick={() => read(p)} disabled={!!reading}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-md bg-violet-50 px-1 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60">
                {reading === p ? <><IconLoader2 size={12} className="animate-spin" /> Okunuyor…</> : <><IconTextScan2 size={12} /> Yazıyı oku</>}
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={!studentId || uploading > 0}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--border)] text-[11.5px] font-medium text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent-dark)] disabled:opacity-50">
          {uploading > 0 ? <IconLoader2 size={20} className="animate-spin" /> : <IconCamera size={22} />}
          {uploading > 0 ? 'Yükleniyor…' : 'Defter fotoğrafı'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      </div>
      {!studentId && <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">Fotoğraf eklemek için önce öğrenci seçin.</p>}
      {msg && <p className={`mt-1.5 text-[12px] ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</p>}
    </div>
  );
}
