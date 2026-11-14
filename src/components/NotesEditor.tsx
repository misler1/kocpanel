'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { IconList, IconListNumbers, IconMicrophone, IconPlayerStopFilled } from '@tabler/icons-react';

// Sesli dikte: tarayıcının konuşma tanıması (Chrome, Edge, Safari). Konuşulanlar Türkçe yazıya dökülüp notun sonuna eklenir.
// Dikte, "Durdur"a basılana kadar açık kalır (tarayıcı sessizlikte kapatırsa kendiliğinden yeniden başlar).
const speechSupported = () =>
  typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
const noopSubscribe = () => () => {};

/** Dikte ile alt satıra geçerken satır başı: düz, madde (•) ya da numaralı (1.) */
type LineStyle = 'duz' | 'madde' | 'numara';
const STYLE_KEY = 'dikte-satir-basi';
const PAUSE_KEY = 'dikte-duraklama';
/** Bu kadar sessizlikten sonra gelen söz yeni satırda başlar */
const PAUSE_MS = 2500;

function linePrefix(textBefore: string, style: LineStyle) {
  if (style === 'madde') return '• ';
  if (style === 'numara') {
    const nums = Array.from(textBefore.matchAll(/(?:^|\n)\s*(\d+)\.\s/g));
    const last = nums[nums.length - 1];
    return `${last ? Number(last[1]) + 1 : 1}. `;
  }
  return '';
}
const EMPTY_LINE = /^\s*(•|\d+\.)?\s*$/;
/** Metnin sonuna yeni satır açar; son satır zaten boşsa (yalnızca önek) yeni satır açmaz, öneki günceller */
function breakLine(text: string, style: LineStyle) {
  const lastLine = text.slice(text.lastIndexOf('\n') + 1);
  if (EMPTY_LINE.test(lastLine)) {
    const head = text.slice(0, text.length - lastLine.length);
    return head + linePrefix(head, style);
  }
  return text.replace(/[ \t]+$/, '') + '\n' + linePrefix(text, style);
}

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
  const [lineStyle, setLineStyleState] = useState<LineStyle>('duz');
  const [pauseBreak, setPauseBreakState] = useState(true);
  const styleRef = useRef<LineStyle>('duz');
  const pauseRef = useRef(true);
  const lastFinalAtRef = useRef<number | null>(null);
  const speakingRef = useRef(false);
  const pendingBreakRef = useRef(false);
  const breakAfterRef = useRef(false);

  function setValue(next: string) {
    valueRef.current = next;
    onChangeRef.current(next);
  }

  function setLineStyle(st: LineStyle) {
    styleRef.current = st;
    setLineStyleState(st);
    try { localStorage.setItem(STYLE_KEY, st); } catch { /* depolama kapalı */ }
    // Son satır boşsa (ör. az önce Enter'a basıldıysa) öneki hemen değiştir
    const v = valueRef.current;
    if (v && EMPTY_LINE.test(v.slice(v.lastIndexOf('\n') + 1))) setValue(breakLine(v, st));
  }
  function setPauseBreak(on: boolean) {
    pauseRef.current = on;
    setPauseBreakState(on);
    try { localStorage.setItem(PAUSE_KEY, on ? '1' : '0'); } catch { /* depolama kapalı */ }
  }

  function appendSpoken(text: string, newLine: boolean) {
    const t = text.trim();
    if (!t) return;
    let base = valueRef.current;
    if (base.trim() === '') base = linePrefix('', styleRef.current);
    else if (newLine) base = breakLine(base, styleRef.current);
    const atLineStart = base === '' || /(^|\n)\s*(•\s|\d+\.\s)?$/.test(base);
    const sep = atLineStart || /\s$/.test(base) ? '' : ' ';
    // Satır ya da cümle başı büyük harfle başlasın
    const starts = atLineStart || /[.!?]\s*$/.test(base);
    const piece = starts ? t.charAt(0).toLocaleUpperCase('tr') + t.slice(1) : t;
    setValue(base + sep + piece);
  }

  // Dikte açıkken Enter: alt satıra geç (konuşma sürüyorsa cümle bitince geçer). Başka bir kutuya yazarken karışmaz.
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      const ours = t === textareaRef.current;
      if (!ours && t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      e.stopPropagation();
      if (speakingRef.current) { breakAfterRef.current = true; return; }
      pendingBreakRef.current = false;
      const v = valueRef.current;
      setValue(v.trim() === '' ? linePrefix('', styleRef.current) : breakLine(v, styleRef.current));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening]);

  function startDictation() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setMicError(null);
    try {
      const st = localStorage.getItem(STYLE_KEY);
      if (st === 'duz' || st === 'madde' || st === 'numara') { styleRef.current = st; setLineStyleState(st); }
      const pb = localStorage.getItem(PAUSE_KEY);
      if (pb === '0' || pb === '1') { pauseRef.current = pb === '1'; setPauseBreakState(pb === '1'); }
    } catch { /* depolama kapalı */ }
    // Notta yazı varsa dikte yeni satırda başlar
    pendingBreakRef.current = valueRef.current.trim() !== '';
    lastFinalAtRef.current = null;
    speakingRef.current = false;
    breakAfterRef.current = false;
    const rec = new SR();
    rec.lang = 'tr-TR';
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // Yeni bir konuşma parçası başlıyor: öncekinden bu yana uzun sessizlik olduysa alt satıra geçilecek
      if (!speakingRef.current) {
        const last = lastFinalAtRef.current;
        if (pauseRef.current && last !== null && Date.now() - last > PAUSE_MS) pendingBreakRef.current = true;
        speakingRef.current = true;
      }
      let partial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          appendSpoken(r[0].transcript, pendingBreakRef.current);
          pendingBreakRef.current = breakAfterRef.current; // konuşurken Enter'a basıldıysa sonraki söz yeni satırda
          breakAfterRef.current = false;
          lastFinalAtRef.current = Date.now();
          speakingRef.current = false;
        } else partial += r[0].transcript;
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
      speakingRef.current = false;
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
        <>
          <p className="mt-1 min-h-[1.25rem] text-[12px] italic text-violet-700">
            {interim || 'Dinliyorum… konuştukça yazı buraya eklenir.'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-violet-50 px-2.5 py-2 text-[11.5px] text-violet-900">
            <span className="font-semibold">Alt satır:</span>
            <div className="flex gap-1">
              {([['duz', 'Düz'], ['madde', '• Madde'], ['numara', '1. Numaralı']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setLineStyle(k)}
                  className={`rounded-md px-2 py-0.5 font-medium ${lineStyle === k ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 hover:bg-violet-100'}`}>
                  {l}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={pauseBreak} onChange={(e) => setPauseBreak(e.target.checked)} className="h-3.5 w-3.5 accent-violet-600" />
              Duraklayınca alt satıra geç
            </label>
            <span className="text-violet-700/80">Enter: alt satır</span>
          </div>
        </>
      )}
      {micError && <p className="mt-1 text-[12px] text-rose-600">{micError}</p>}
    </div>
  );
}