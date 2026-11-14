'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { IconList, IconListNumbers, IconMicrophone, IconPlayerStopFilled } from '@tabler/icons-react';

// Sesli dikte: tarayıcının konuşma tanıması (Chrome, Edge, Safari). Konuşulanlar Türkçe yazıya dökülüp notun sonuna eklenir.
// Dikte, "Durdur"a basılana kadar açık kalır (tarayıcı sessizlikte kapatırsa kendiliğinden yeniden başlar).
const speechSupported = () =>
  typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
const noopSubscribe = () => () => {};

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  /** Sesli dikte düğmesi (varsayılan: açık) */
  dictation?: boolean;
}

export function NotesEditor({ value, onChange, rows = 5, placeholder, className, dictation = true }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canDictate = useSyncExternalStore(noopSubscribe, speechSupported, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const wantRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => { valueRef.current = value; onChangeRef.current = onChange; }, [value, onChange]);
  useEffect(() => () => { wantRef.current = false; try { recRef.current?.stop(); } catch { /* zaten kapalı */ } }, []);

  function appendSpoken(text: string) {
    const t = text.trim();
    if (!t) return;
    const base = valueRef.current;
    const sep = base === '' || /\s$/.test(base) ? '' : ' ';
    // Yeni cümle büyük harfle başlasın
    const starts = base.trim() === '' || /[.!?\n]\s*$/.test(base);
    const piece = starts ? t.charAt(0).toLocaleUpperCase('tr') + t.slice(1) : t;
    const next = base + sep + piece;
    valueRef.current = next;
    onChangeRef.current(next);
  }

  function startDictation() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setMicError(null);
    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) appendSpoken(r[0].transcript);
        else partial += r[0].transcript;
      }
      setInterim(partial);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantRef.current = false;
        setMicError('Mikrofon izni verilmedi. Tarayıcının adres çubuğundan mikrofona izin verin.');
      } else if (e.error === 'audio-capture') {
        wantRef.current = false;
        setMicError('Mikrofon bulunamadı.');
      }
    };
    rec.onend = () => {
      setInterim('');
      if (wantRef.current) {
        try { rec.start(); return; } catch { /* yeniden başlatılamadı */ }
      }
      wantRef.current = false;
      setListening(false);
    };
    recRef.current = rec;
    wantRef.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      wantRef.current = false;
      setMicError('Dikte başlatılamadı.');
    }
  }

  function stopDictation() {
    wantRef.current = false;
    try { recRef.current?.stop(); } catch { /* zaten kapalı */ }
    setListening(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter') return;
    const el = e.currentTarget;
    const cursor = el.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);
    const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
    const currentLine = textBeforeCursor.slice(lineStart);

    const bulletMatch = currentLine.match(/^(\s*)•\s(.*)$/);
    const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/);

    if (bulletMatch) {
      e.preventDefault();
      const [, indent, rest] = bulletMatch;
      if (rest.trim() === '') {
        const newValue = value.slice(0, lineStart) + value.slice(cursor);
        onChange(newValue);
        requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart));
      } else {
        const insert = `\n${indent}• `;
        const newValue = value.slice(0, cursor) + insert + value.slice(cursor);
        onChange(newValue);
        const newPos = cursor + insert.length;
        requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
      }
      return;
    }

    if (numberMatch) {
      e.preventDefault();
      const [, indent, num, rest] = numberMatch;
      if (rest.trim() === '') {
        const newValue = value.slice(0, lineStart) + value.slice(cursor);
        onChange(newValue);
        requestAnimationFrame(() => el.setSelectionRange(lineStart, lineStart));
      } else {
        const nextNum = Number(num) + 1;
        const insert = `\n${indent}${nextNum}. `;
        const newValue = value.slice(0, cursor) + insert + value.slice(cursor);
        onChange(newValue);
        const newPos = cursor + insert.length;
        requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
      }
    }
  }

  // Seçimin kapsadığı satırların tam aralığını (satır başı/sonu) döndürür
  function getSelectionLineRange(start: number, end: number) {
    const lineStart = value.lastIndexOf('\n', Math.max(start - 1, 0)) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    return { lineStart, lineEnd };
  }

  function insertBullet() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end) {
      const textBeforeCursor = value.slice(0, start);
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const needsNewline = start !== lineStart && value.slice(lineStart, start).trim() !== '';
      const insert = needsNewline ? '\n• ' : '• ';
      const newValue = value.slice(0, start) + insert + value.slice(start);
      onChange(newValue);
      const newPos = start + insert.length;
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(newPos, newPos); });
      return;
    }

    // Seçili metin birden fazla satıra yayılıyorsa, her satırı ayrı madde yap
    const { lineStart, lineEnd } = getSelectionLineRange(start, end);
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');
    const newBlock = lines
      .map((line) => (line.trim() === '' ? line : `• ${line.replace(/^(\s*)(•|\d+\.)\s*/, '')}`))
      .join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    onChange(newValue);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(lineStart, lineStart + newBlock.length); });
  }

  function insertNumbered() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end) {
      const textBeforeCursor = value.slice(0, start);
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const needsNewline = start !== lineStart && value.slice(lineStart, start).trim() !== '';
      const insert = needsNewline ? '\n1. ' : '1. ';
      const newValue = value.slice(0, start) + insert + value.slice(start);
      onChange(newValue);
      const newPos = start + insert.length;
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(newPos, newPos); });
      return;
    }

    const { lineStart, lineEnd } = getSelectionLineRange(start, end);
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');
    let counter = 1;
    const newBlock = lines
      .map((line) => {
        if (line.trim() === '') return line;
        const cleaned = line.replace(/^(\s*)(•|\d+\.)\s*/, '');
        return `${counter++}. ${cleaned}`;
      })
      .join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    onChange(newValue);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(lineStart, lineStart + newBlock.length); });
  }

  return (
    <div>
      <div className="mb-1.5 flex gap-1.5">
        <button type="button" onClick={insertBullet}
          className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
          <IconList size={13} /> Madde
        </button>
        <button type="button" onClick={insertNumbered}
          className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
          <IconListNumbers size={13} /> Numaralı
        </button>
        {dictation && canDictate && (
          listening ? (
            <button type="button" onClick={stopDictation}
              className="ml-auto flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-rose-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Dinliyor · Durdur <IconPlayerStopFilled size={12} />
            </button>
          ) : (
            <button type="button" onClick={startDictation} title="Konuştuklarınız yazıya dökülüp notun sonuna eklenir"
              className="ml-auto flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-100">
              <IconMicrophone size={13} /> Sesli dikte
            </button>
          )
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder}
        className={className ?? 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'}
      />
      {listening && (
        <p className="mt-1 min-h-[1.25rem] text-[12px] italic text-violet-700">
          {interim || 'Dinliyorum… konuştukça yazı buraya eklenir.'}
        </p>
      )}
      {micError && <p className="mt-1 text-[12px] text-rose-600">{micError}</p>}
    </div>
  );
}