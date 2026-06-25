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
        icon={<IconUsers size={14} className="text-gray-500" />}
        label="Öğrenci"
        value={String(studentCount)}
        sub={`${yksCount} YKS · ${lgsCount} LGS`}
        subColor="text-gray-400"
      />
      <StatCard
        icon={<IconNotes size={14} className="text-gray-500" />}
        label="Bu hafta görüşme"
        value={String(weeklyMeetings)}
        sub={pendingMeetings > 0 ? `${pendingMeetings} bekliyor` : 'Hepsi tamam'}
        subColor={pendingMeetings > 0 ? 'text-amber-600' : 'text-emerald-600'}
      />
      <StatCard
        icon={<IconChartBar size={14} className="text-gray-500" />}
        label="Deneme girilmedi"
        value={String(missingExamAnalysis)}
        sub="Analiz eksik"
        subColor={missingExamAnalysis > 0 ? 'text-amber-600' : 'text-emerald-600'}
      />
      <StatCard
        icon={<IconCheckbox size={14} className="text-gray-500" />}
        label="Haftalık soru"
        value={`${weeklyQuestionCompletion}%`}
        sub="Ortalama tamamlama"
        subColor={weeklyQuestionCompletion >= 70 ? 'text-emerald-600' : 'text-amber-600'}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 md:rounded-lg md:px-4 md:py-3.5">
      <div className="mb-1 flex items-center gap-1.5 text-[12px] text-gray-500">
        {icon}
        {label}
      </div>
      <div className="text-[22px] font-medium text-gray-900">{value}</div>
      <div className={`mt-0.5 text-[12px] ${subColor}`}>{sub}</div>
    </div>
  );
}
