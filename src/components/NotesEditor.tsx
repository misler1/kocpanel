'use client';

import { useRef } from 'react';
import { IconList, IconListNumbers } from '@tabler/icons-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export function NotesEditor({ value, onChange, rows = 5, placeholder, className }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    </div>
  );
}