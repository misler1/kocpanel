const ROWS = [
  { subject: 'Türkçe', net: '34,50', color: '#2F6F52' },
  { subject: 'Matematik', net: '28,75', color: '#2F6F52' },
  { subject: 'Fen Bilimleri', net: '19,25', color: '#C1442A' },
  { subject: 'Sosyal Bilimler', net: '16,00', color: '#2F6F52' },
];

export function ReportCardVisual() {
  return (
    <div className="relative rounded-2xl border border-[#D9D2C2] bg-white p-6 shadow-[0_20px_40px_-24px_rgba(29,43,58,0.35)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-[15px] text-[#1D2B3A]">Deneme Karnesi</span>
        <span className="text-[11px] text-[#9A927E]">12 Eylül 2026</span>
      </div>
      <div className="space-y-3">
        {ROWS.map((r) => (
          <div key={r.subject} className="flex items-center justify-between border-b border-dashed border-[#E8E2D6] pb-2">
            <span className="text-[13px] text-[#4A4438]">{r.subject}</span>
            <span className="text-[13px] font-semibold" style={{ color: r.color }}>{r.net} net</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-[#FBF9F4] px-3 py-2.5">
        <span className="text-[12px] text-[#6B6558]">Toplam net</span>
        <span className="text-[16px] font-semibold text-[#1D2B3A]">98,50</span>
      </div>
    </div>
  );
}