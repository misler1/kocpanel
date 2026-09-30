const ROWS = [
  { subject: 'Türkçe', net: '34,50', color: 'text-emerald-700' },
  { subject: 'Matematik', net: '28,75', color: 'text-emerald-700' },
  { subject: 'Fen Bilimleri', net: '19,25', color: 'text-amber-700' },
  { subject: 'Sosyal Bilimler', net: '16,00', color: 'text-emerald-700' },
];

export function ReportCardVisual() {
  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.25)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-[15px] text-gray-900">Deneme Karnesi</span>
        <span className="text-[11px] text-gray-400">12 Eylül 2026</span>
      </div>
      <div className="space-y-3">
        {ROWS.map((r) => (
          <div key={r.subject} className="flex items-center justify-between border-b border-dashed border-gray-100 pb-2">
            <span className="text-[13px] text-gray-600">{r.subject}</span>
            <span className={`text-[13px] font-semibold ${r.color}`}>{r.net} net</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2.5">
        <span className="text-[12px] text-gray-600">Toplam net</span>
        <span className="text-[16px] font-semibold text-blue-700">98,50</span>
      </div>
    </div>
  );
}