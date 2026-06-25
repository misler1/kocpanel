'use client';

import { type SubjectResult, calcNetYKS, calcNetLGS } from './examConstants';

interface SubjectRowProps {
  label: string;
  total: number;
  value: SubjectResult;
  onChange: (v: SubjectResult) => void;
  calcFn: 'yks' | 'lgs';
  warn?: string; // mat+geo uyarısı
}

const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-center text-sm focus:border-blue-500 focus:bg-white focus:outline-none';

export function SubjectRow({ label, total, value, onChange, calcFn, warn }: SubjectRowProps) {
  const d = Number(value.dogru) || 0;
  const y = Number(value.yanlis) || 0;
  const net = calcFn === 'yks' ? calcNetYKS(d, y) : calcNetLGS(d, y);
  const bos = Math.max(0, total - d - y);
  const isOver = d + y > total;

  return (
    <div className={`grid grid-cols-12 items-center gap-2 rounded-lg px-3 py-2 ${isOver ? 'bg-red-50' : 'bg-white border border-gray-100'}`}>
      {/* Ders adı */}
      <div className="col-span-4">
        <span className="text-[13px] font-medium text-gray-800">{label}</span>
        <span className="ml-1.5 text-[11px] text-gray-400">/{total}</span>
        {warn && <div className="text-[11px] text-amber-600">{warn}</div>}
        {isOver && <div className="text-[11px] text-red-600">Toplam aşıldı!</div>}
      </div>

      {/* Doğru */}
      <div className="col-span-2">
        <label className="mb-0.5 block text-[10px] text-gray-400 text-center">Doğru</label>
        <input
          type="number"
          min={0}
          max={total}
          value={value.dogru}
          onChange={(e) => onChange({ ...value, dogru: e.target.value })}
          className={inputCls}
          placeholder="0"
        />
      </div>

      {/* Yanlış */}
      <div className="col-span-2">
        <label className="mb-0.5 block text-[10px] text-gray-400 text-center">Yanlış</label>
        <input
          type="number"
          min={0}
          max={total}
          value={value.yanlis}
          onChange={(e) => onChange({ ...value, yanlis: e.target.value })}
          className={inputCls}
          placeholder="0"
        />
      </div>

      {/* Boş */}
      <div className="col-span-2 text-center">
        <div className="text-[10px] text-gray-400">Boş</div>
        <div className={`text-[13px] font-medium ${bos < 0 ? 'text-red-600' : 'text-gray-500'}`}>{bos < 0 ? '!' : bos}</div>
      </div>

      {/* Net */}
      <div className="col-span-2 text-center">
        <div className="text-[10px] text-gray-400">Net</div>
        <div className={`text-[14px] font-semibold ${net > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
          {d + y === 0 ? '—' : net.toFixed(2).replace(/\.00$/, '')}
        </div>
      </div>
    </div>
  );
}
