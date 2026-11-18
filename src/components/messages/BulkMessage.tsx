'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowLeft, IconCheck, IconSend, IconX } from '@tabler/icons-react';
import { hasNameToken, personalize } from '@/lib/personalize';

type Contact = { id: string; full_name: string; role: string; kurum: string | null; sinif: string | null; is_my_student: boolean };

export function BulkMessage({ supabase, onClose, onSent }: {
  supabase: any;
  onClose: () => void;
  onSent: () => void;
}) {
  const [step, setStep] = useState<'pick' | 'write' | 'done'>('pick');
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [q, setQ] = useState('');
  const [kurum, setKurum] = useState('');
  const [sinif, setSinif] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState('Merhaba {ad}, ');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; skipped: { name: string; reason: string }[] } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.rpc('message_contacts');
      if (err) setError(err.message);
      setContacts(((data ?? []) as Contact[]).filter((c) => c.is_my_student).sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr')));
    })();
  }, [supabase]);

  const kurumlar = useMemo(() => Array.from(new Set((contacts ?? []).map((c) => c.kurum).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'tr')), [contacts]);
  const siniflar = useMemo(() => Array.from(new Set((contacts ?? []).filter((c) => !kurum || c.kurum === kurum).map((c) => c.sinif).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'tr')), [contacts, kurum]);

  const list = (contacts ?? []).filter((c) => {
    if (kurum && c.kurum !== kurum) return false;
    if (sinif && c.sinif !== sinif) return false;
    return !q.trim() || c.full_name.toLocaleLowerCase('tr').includes(q.trim().toLocaleLowerCase('tr'));
  });
  const allSelected = list.length > 0 && list.every((c) => selected.has(c.id));
  const chosen = (contacts ?? []).filter((c) => selected.has(c.id));

  function toggle(id: string) {
    setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((p) => {
      const n = new Set(p);
      if (allSelected) list.forEach((c) => n.delete(c.id)); else list.forEach((c) => n.add(c.id));
      return n;
    });
  }

  // İmlecin olduğu yere {ad} / {adsoyad} ekler
  function insertToken(token: string) {
    const el = taRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function send() {
    const tpl = text.trim();
    if (!tpl) { setError('Mesaj yazın.'); return; }
    if (!chosen.length) { setError('En az bir öğrenci seçin.'); return; }
    if (!window.confirm(`Mesaj ${chosen.length} öğrenciye ayrı ayrı (özel mesaj olarak) gönderilsin mi?`)) return;
    setBusy(true); setError(null);
    const items = chosen.map((c) => ({ to: c.id, content: personalize(tpl, c.full_name) }));
    const { data, error: err } = await supabase.rpc('send_bulk_message', { p_items: items });
    setBusy(false);
    if (err) {
      setError(err.code === 'PGRST202' ? 'Toplu mesaj henüz etkin değil (supabase/toplu_mesaj.sql çalıştırılmalı).' : err.message);
      return;
    }
    const names = new Map(chosen.map((c) => [c.id, c.full_name]));
    setResult({
      sent: data?.sent ?? 0,
      skipped: (data?.skipped ?? []).map((s: any) => ({ name: names.get(s.to) ?? 'Bilinmeyen', reason: s.reason })),
    });
    setStep('done');
    onSent();
  }

  const field = 'w-full rounded-lg border border-[var(--border)] bg-[var(--paper)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]';
  const preview = chosen.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[var(--card)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          {step === 'write' && (
            <button type="button" onClick={() => { setStep('pick'); setError(null); }} className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--paper)]" aria-label="Geri">
              <IconArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">Toplu mesaj</h2>
            <p className="text-[11.5px] text-[var(--ink-muted)]">
              {step === 'pick' ? '1/2 · Öğrencileri seçin' : step === 'write' ? `2/2 · Mesajı yazın (${chosen.length} öğrenci)` : 'Gönderildi'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--paper)]"><IconX size={18} /></button>
        </div>

        {step === 'pick' && (
          <>
            <div className="space-y-2 border-b border-[var(--border)] p-3">
              <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-[12px] text-[var(--accent-dark)]">
                Grup kurulmaz: mesaj her öğrenciye <b>kendi özel sohbetine</b> ayrı gider. Öğrenciler birbirini görmez, cevapları size özel gelir.
              </p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İsim ara" className={field} autoFocus />
              {kurumlar.length > 0 && (
                <div className="flex gap-2">
                  <select value={kurum} onChange={(e) => { setKurum(e.target.value); setSinif(''); }} className={field}>
                    <option value="">Tüm kurumlar</option>
                    {kurumlar.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  {siniflar.length > 0 && (
                    <select value={sinif} onChange={(e) => setSinif(e.target.value)} className={field}>
                      <option value="">Tüm sınıflar</option>
                      {siniflar.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  )}
                </div>
              )}
              {list.length > 0 && (
                <button type="button" onClick={toggleAll} className="text-[12.5px] font-semibold text-[var(--accent-dark)] hover:underline">
                  {allSelected ? 'Seçimi kaldır' : `Listelenen ${list.length} öğrencinin hepsini seç`}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts === null ? (
                <p className="p-6 text-center text-[13px] text-[var(--ink-muted)]">Yükleniyor…</p>
              ) : list.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-[var(--ink-muted)]">
                  {contacts.length === 0 ? 'Hesabı açık öğrenciniz yok. (Mesaj yalnızca uygulamaya giriş hesabı olan öğrencilere gider.)' : 'Sonuç yok.'}
                </p>
              ) : list.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button key={c.id} type="button" onClick={() => toggle(c.id)}
                    className="flex w-full items-center gap-3 border-b border-[var(--border)] px-4 py-2.5 text-left last:border-b-0 hover:bg-[var(--paper)]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[var(--ink)]">{c.full_name}</span>
                      <span className="block truncate text-[12px] text-[var(--ink-muted)]">{[c.kurum, c.sinif].filter(Boolean).join(' · ') || 'Öğrenci'}</span>
                    </span>
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[var(--border)]'}`}>
                      {on && <IconCheck size={13} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {error && <p className="bg-[var(--danger-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] p-3">
              <span className="text-[13px] text-[var(--ink-muted)]">{selected.size} öğrenci seçildi</span>
              <button type="button" disabled={selected.size === 0} onClick={() => { setStep('write'); setError(null); }}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
                Devam → Mesajı yaz
              </button>
            </div>
          </>
        )}

        {step === 'write' && (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              <div>
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] text-[var(--ink-muted)]">Kişiye özel ekle:</span>
                  <button type="button" onClick={() => insertToken('{ad}')}
                    className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--accent-dark)] hover:bg-[var(--accent)] hover:text-white">
                    + Ad
                  </button>
                  <button type="button" onClick={() => insertToken('{adsoyad}')}
                    className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--paper)]">
                    + Ad Soyad
                  </button>
                </div>
                <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={1900} autoFocus
                  placeholder="Merhaba {ad}, haydi çalışmaya başla, güzel bir gün seni bekliyor!"
                  className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--paper)] px-3.5 py-2.5 text-[14px] outline-none focus:border-[var(--accent)]" />
                <p className="mt-1 text-[11.5px] text-[var(--ink-muted)]">
                  <b>{'{ad}'}</b> yazan yere her öğrencinin kendi adı gelir. Butona basmak yerine elle <b>{'{ad}'}</b> ya da <b>[ad]</b> da yazabilirsiniz.
                </p>
              </div>

              <div>
                <p className="mb-1 text-[12px] font-semibold text-[var(--ink)]">Önizleme {hasNameToken(text) ? '(her öğrenci kendi adını görür)' : ''}</p>
                <div className="space-y-1.5 rounded-xl bg-[var(--paper)] p-2.5">
                  {preview.map((c) => (
                    <div key={c.id}>
                      <p className="text-[11px] text-[var(--ink-muted)]">→ {c.full_name}</p>
                      <div className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-[var(--accent)] px-3 py-1.5 text-[13px] text-white">
                        {personalize(text.trim(), c.full_name) || '…'}
                      </div>
                    </div>
                  ))}
                  {chosen.length > preview.length && <p className="text-center text-[11.5px] text-[var(--ink-muted)]">… ve {chosen.length - preview.length} öğrenci daha</p>}
                </div>
              </div>
            </div>
            {error && <p className="bg-[var(--danger-soft)] px-4 py-2 text-[13px] font-semibold text-[var(--danger)]">{error}</p>}
            <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] p-3">
              <span className="text-[13px] text-[var(--ink-muted)]">{chosen.length} öğrenciye ayrı ayrı</span>
              <button type="button" disabled={busy || !text.trim()} onClick={send}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-50">
                <IconSend size={15} /> {busy ? 'Gönderiliyor…' : 'Gönder'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && result && (
          <div className="space-y-3 p-5">
            <p className="text-[15px] font-semibold text-[var(--ink)]">✅ {result.sent} öğrenciye gönderildi.</p>
            {result.skipped.length > 0 && (
              <div className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12.5px] text-[var(--danger)]">
                <p className="font-semibold">Gönderilemeyenler ({result.skipped.length}):</p>
                {result.skipped.map((s, i) => <p key={i}>• {s.name}: {s.reason}</p>)}
              </div>
            )}
            <p className="text-[12px] text-[var(--ink-muted)]">Mesajlar her öğrencinin özel sohbetinde görünür; cevap veren olursa ilgili sohbette görürsünüz.</p>
            <div className="text-right">
              <button type="button" onClick={onClose} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-dark)]">Kapat</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
