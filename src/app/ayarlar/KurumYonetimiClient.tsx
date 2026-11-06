'use client';

import { useEffect, useState } from 'react';
import { IconPencil, IconGitMerge } from '@tabler/icons-react';
import { SuggestInput } from '@/components/SuggestInput';

type Kurum = { name: string; count: number };

export function KurumYonetimiClient() {
  const [list, setList] = useState<Kurum[] | null>(null);
  const [empty, setEmpty] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/kurumlar');
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(json.error ?? 'Kurumlar yüklenemedi.'); setList([]); return; }
    setList(json.kurumlar); setEmpty(json.empty); setIsAdmin(json.isAdmin);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function save(from: string) {
    const to = value.trim();
    if (!to || to === from) { setEditing(null); return; }
    const target = list?.find((k) => k.name === to);
    if (target && !confirm(`"${from}" kurumundaki öğrenciler "${to}" ile birleştirilsin mi?`)) return;
    setBusy(true); setMsg(null);
    const res = await fetch('/api/kurumlar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(json.error ?? 'Kaydedilemedi.'); return; }
    setMsg(`${json.updated} öğrencinin kurumu "${to}" olarak güncellendi.`);
    setEditing(null);
    load();
  }

  return (
    <div className="px-4 py-3">
      <p className="mb-3 text-[12px] text-gray-500">
        {isAdmin ? 'Tüm öğrencilerin' : 'Kendi öğrencilerinizin'} kurumları. Aynı kurum farklı yazılmışsa birini diğerinin adıyla
        yeniden adlandırın; öğrenciler tek kurumda birleşir. Öğrenci formundaki kurum önerileri ve grup sohbetindeki kurum filtresi bu adları kullanır.
      </p>
      {msg && <p className="mb-2 rounded-lg bg-blue-50 px-3 py-2 text-[12.5px] text-blue-700">{msg}</p>}
      {list === null ? (
        <p className="py-3 text-[13px] text-gray-400">Yükleniyor…</p>
      ) : list.length === 0 ? (
        <p className="py-3 text-[13px] text-gray-400">Henüz kurum bilgisi girilmiş öğrenci yok.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {list.map((k) => (
            <li key={k.name} className="flex items-center gap-2 py-2">
              {editing === k.name ? (
                <>
                  <div className="min-w-0 flex-1">
                    <SuggestInput options={(list ?? []).map((x) => x.name)} value={value} onChange={setValue} autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') save(k.name); if (e.key === 'Escape') setEditing(null); }}
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-[13px] outline-none focus:border-blue-500" />
                  </div>
                  <button disabled={busy} onClick={() => save(k.name)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">Kaydet</button>
                  <button onClick={() => setEditing(null)} className="px-2 text-[12.5px] text-gray-500">Vazgeç</button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-gray-900">{k.name}</span>
                  <span className="text-[12px] text-gray-400">{k.count} öğrenci</span>
                  <button onClick={() => { setEditing(k.name); setValue(k.name); setMsg(null); }} title="Yeniden adlandır / birleştir"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><IconPencil size={15} /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {empty > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-gray-500">
          <IconGitMerge size={14} /> {empty} öğrencinin kurumu boş. Öğrenci düzenleme ekranından ekleyebilirsiniz.
        </p>
      )}
    </div>
  );
}
