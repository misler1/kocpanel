'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export function KurulumClient({ name, initialStep, currentEmail }: { name: string; initialStep: 'sifre' | 'eposta'; currentEmail: string }) {
  const [step, setStep] = useState(initialStep);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [email, setEmail] = useState(currentEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const call = (body: object) => fetch('/api/personel/kurulum', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pw.length < 8) return setError('Şifre en az 8 karakter olmalı.');
    if (pw !== pw2) return setError('Şifreler aynı değil.');
    setBusy(true);
    const { error: err } = await createClient().auth.updateUser({ password: pw });
    if (err) { setBusy(false); return setError(/different|same/i.test(err.message) ? 'Yeni şifre eskisinden farklı olmalı.' : 'Şifre değiştirilemedi: ' + err.message); }
    const res = await call({ action: 'password' }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError('Şifreniz değişti ama kaydı tamamlanamadı. Sayfayı yenileyip yeni şifrenizle tekrar deneyin.');
    setStep('eposta');
  }

  // Panele tam sayfa geçiş: aynı sayfaya geri yönlenme olursa ekran eski hâlinde (Kaydediliyor…) takılı kalmaz
  const goHome = () => window.location.assign('/anasayfa');

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await call({ action: 'email', email }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(json.error ?? 'Kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    setDone(json.sent ? 'E-posta adresiniz kaydedildi, hoş geldiniz e-postası gönderildi.' : 'E-posta adresiniz kaydedildi.');
    setTimeout(goHome, 1200);
  }

  async function skip() {
    setBusy(true);
    setError('');
    await call({ action: 'skip' }).catch(() => null); // hatırlatma oluşmasa da panele geçilir
    goHome();
  }

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-[15px] focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500';
  const btn = 'w-full rounded-lg bg-teal-600 py-2.5 text-[15px] font-semibold text-white hover:bg-teal-700 disabled:opacity-60';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        <div className="mb-5 flex justify-center"><Image src="/brand/kocdefterim-logo.png" alt="KoçDefterim" width={260} height={75} className="h-12 w-auto object-contain" priority /></div>
        <div className="mb-5 flex items-center justify-center gap-2 text-[12px] font-semibold text-gray-400">
          <span className={step === 'sifre' ? 'text-teal-600' : ''}>1. Şifre</span><span>›</span>
          <span className={step === 'eposta' ? 'text-teal-600' : ''}>2. E-posta</span>
        </div>

        {step === 'sifre' ? (
          <form onSubmit={savePassword} className="space-y-3">
            <h1 className="text-center text-[18px] font-bold text-gray-900">Hoş geldiniz{name ? `, ${name.split(' ')[0]}` : ''} 👋</h1>
            <p className="text-center text-[13.5px] text-gray-500">Güvenliğiniz için size verilen ilk şifreyi kendi şifrenizle değiştirin.</p>
            <input type="password" autoComplete="new-password" className={input} placeholder="Yeni şifre (en az 8 karakter)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <input type="password" autoComplete="new-password" className={input} placeholder="Yeni şifre (tekrar)" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {error && <p className="text-[13px] text-rose-600">{error}</p>}
            <button type="submit" disabled={busy} className={btn}>{busy ? 'Kaydediliyor…' : 'Şifreyi kaydet'}</button>
          </form>
        ) : (
          <form onSubmit={saveEmail} className="space-y-3">
            <h1 className="text-center text-[18px] font-bold text-gray-900">E-posta adresiniz</h1>
            <p className="text-center text-[13.5px] text-gray-500">Duyuruları ve hesap bilgilerini alabilmeniz için e-posta adresinizi ekleyin. Girişi yine telefon numaranızla yaparsınız.</p>
            <input type="email" autoComplete="email" className={input} placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="text-[13px] text-rose-600">{error}</p>}
            {done && <p className="text-[13px] font-medium text-emerald-600">{done}</p>}
            <button type="submit" disabled={busy || !!done || !email.trim()} className={btn}>{busy ? 'Kaydediliyor…' : 'Kaydet ve devam et'}</button>
            <button type="button" onClick={skip} disabled={busy || !!done} className="w-full py-1.5 text-[13px] text-gray-500 hover:text-gray-700">{busy && !email.trim() ? 'Panele geçiliyor…' : 'Daha sonra eklerim'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
