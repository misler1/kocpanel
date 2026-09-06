import { IconUsers, IconNotes, IconChartBar, IconCheckbox } from '@tabler/icons-react';

interface StatCardsProps {
  studentCount: number;
  yksCount: number;
  lgsCount: number;
  weeklyMeetings: number;
  pendingMeetings: number;
  missingExamAnalysis: number;
  weeklyQuestionCompletion: number;
}

export function StatCards({
  studentCount,
  yksCount,
  lgsCount,
  weeklyMeetings,
  pendingMeetings,
  missingExamAnalysis,
  weeklyQuestionCompletion,
}: StatCardsProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      <StatCard
        icon={<IconUsers size={15} />}
        bg="bg-[var(--track-yks-soft)]"
        border="border-[var(--track-yks)]/15"
        chipBg="bg-[var(--track-yks)]"
        tone="text-[var(--track-yks)]"
        label="Öğrenci"
        value={String(studentCount)}
        sub={`${yksCount} YKS · ${lgsCount} LGS`}
      />
      <StatCard
        icon={<IconNotes size={15} />}
        bg="bg-[var(--accent-soft)]"
        border="border-[var(--accent)]/15"
        chipBg="bg-[var(--accent)]"
        tone="text-[var(--accent-dark)]"
        label="Bu hafta görüşme"
        value={String(weeklyMeetings)}
        sub={pendingMeetings > 0 ? `${pendingMeetings} bekliyor` : 'Hepsi tamam'}
      />
      <StatCard
        icon={<IconChartBar size={15} />}
        bg="bg-[var(--track-lgs-soft)]"
        border="border-[var(--track-lgs)]/15"
        chipBg="bg-[var(--track-lgs)]"
        tone="text-[var(--track-lgs)]"
        label="Deneme girilmedi"
        value={String(missingExamAnalysis)}
        sub="Analiz eksik"
      />
      <StatCard
        icon={<IconCheckbox size={15} />}
        bg="bg-[var(--success-soft)]"
        border="border-[var(--success)]/15"
        chipBg="bg-[var(--success)]"
        tone="text-[var(--success)]"
        label="Haftalık soru"
        value={`${weeklyQuestionCompletion}%`}
        sub="Ortalama tamamlama"
      />
    </div>
  );
}

function StatCard({
  icon,
  bg,
  border,
  chipBg,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  bg: string;
  border: string;
  chipBg: string;
  tone: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} px-3.5 py-3.5 md:px-4 md:py-4`}>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${chipBg} text-white`}>
          {icon}
        </span>
        <span className={`text-[12.5px] font-medium ${tone}`}>{label}</span>
      </div>
      <div className="text-[24px] font-semibold tracking-tight text-[var(--ink)]">{value}</div>
      <div className={`mt-1 text-[12.5px] font-medium ${tone}`}>{sub}</div>
    </div>
  );
}