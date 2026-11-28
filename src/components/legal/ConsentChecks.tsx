'use client';

import Link from 'next/link';

// Kayıt formlarında yasal onay kutuları (src/lib/legal.ts). Bağlantılar yeni sekmede açılır, form kaybolmaz.
const a = 'font-medium text-[var(--accent-dark)] underline';

export function ConsentChecks({ terms, setTerms, consent, setConsent, minor, parent, setParent }: {
  terms: boolean; setTerms: (v: boolean) => void;
  consent: boolean; setConsent: (v: boolean) => void;
  /** 18 yaş altı öğrenci: veli onayı kutusu */
  minor?: boolean; parent?: boolean; setParent?: (v: boolean) => void;
}) {
  const row = 'flex cursor-pointer items-start gap-2 text-[12.5px] leading-snug text-[var(--ink-muted)]';
  const box = 'mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--accent)]';
  return (
    <div className="space-y-2">
      <label className={row}>
        <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className={box} />
        <span>
          <Link href="/kullanim-kosullari" target="_blank" className={a}>Kullanım Koşulları</Link>&apos;nı kabul ediyorum,{' '}
          <Link href="/kvkk" target="_blank" className={a}>KVKK Aydınlatma Metni</Link>&apos;ni ve{' '}
          <Link href="/gizlilik" target="_blank" className={a}>Gizlilik Politikası</Link>&apos;nı okudum.
        </span>
      </label>
      <label className={row}>
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className={box} />
        <span>
          Verilerimin yurt dışındaki hizmet sağlayıcılara aktarılması ve yapay zekâ destekli analizler için{' '}
          <Link href="/acik-riza" target="_blank" className={a}>Açık Rıza Metni</Link>&apos;ni onaylıyorum.
        </span>
      </label>
      {minor && setParent && (
        <label className={`${row} rounded-lg bg-amber-50 p-2 text-amber-900`}>
          <input type="checkbox" required checked={!!parent} onChange={(e) => setParent(e.target.checked)} className={box} />
          <span>18 yaşından küçüğüm; velim bu kaydı biliyor ve yukarıdaki metinleri benim adıma onaylıyor.</span>
        </label>
      )}
    </div>
  );
}
