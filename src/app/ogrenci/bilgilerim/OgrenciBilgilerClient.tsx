'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { IconUsers, IconSchool } from '@tabler/icons-react';
import {
  Accordion, InfoRow, GunlukAccordion, TRACK_LABELS, TRACK_RESOURCES,
} from '../../ogrenciler/[id]/OgrenciDetayClient';

// Öğrencinin kendi bilgileri (salt okunur) + Günlük. Koç sayfasındaki bileşenlerin aynısı kullanılır,
// böylece iki taraf birbirinden ayrışmaz.
export function OgrenciBilgilerClient({ student }: { student: any }) {
  const birth = student.birth_date
    ? new Date(student.birth_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const resources: Record<string, [string, string, string]> = student.resources ?? {};
  const hasResources = Object.values(resources).some((arr) => arr.some(Boolean));
  const hasGuardian = student.guardian_name || student.mother_name || student.father_name;

  const initials = student.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[28px] border-2 border-[var(--border)] bg-[var(--card)]">
        <div className="h-20 bg-gradient-to-r from-[#A78BFA] via-[#F472B6] to-[#FBBF24]" />
        <div className="px-5 pb-5">
          <div className="-mt-10 mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] text-[26px] font-extrabold text-white ring-[6px] ring-white">
            {initials}
          </div>
          <h2 className="text-[22px] font-extrabold text-[var(--ink)]">{student.full_name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-bold text-[var(--accent-dark)]">🎓 {TRACK_LABELS[student.track] ?? student.track}</span>
            {student.grade_level && <span className="rounded-full bg-[var(--sky-soft)] px-3 py-1 text-[12px] font-bold text-[#1F78BD]">🏫 {student.grade_level}</span>}
          </div>
        </div>
        <div className="mx-5 mb-5 rounded-2xl bg-[var(--paper)] px-4 py-3">
          <p className="mb-1 text-[12px] font-extrabold text-[var(--ink-muted)]">📇 Temel Bilgiler</p>
          <InfoRow label="Ad Soyad" value={student.full_name} />
          <InfoRow label="Telefon" value={student.phone} />
          <InfoRow label="Doğum Tarihi" value={birth} />
          <InfoRow label="Kurum" value={student.kurum} />
          <InfoRow label="Sınav Türü" value={TRACK_LABELS[student.track] ?? student.track} />
          <InfoRow label="Sınıf Düzeyi" value={student.grade_level} />
          <InfoRow label="Sınıf / Şube" value={student.sinif_sube} />
          <InfoRow label="Dönem" value={student.donem} />
        </div>
      </div>

      {hasGuardian && (
        <Accordion icon={<IconUsers size={16} />} title="Veli Bilgileri">
          {student.guardian_name && (
            <>
              <InfoRow label="Veli" value={student.guardian_name} />
              <InfoRow label="Telefon" value={student.guardian_phone} />
              <InfoRow label="Yakınlık" value={student.guardian_relation} />
            </>
          )}
          <InfoRow label="Anne" value={[student.mother_name, student.mother_phone].filter(Boolean).join(' · ')} />
          <InfoRow label="Baba" value={[student.father_name, student.father_phone].filter(Boolean).join(' · ')} />
        </Accordion>
      )}

      {hasResources && (
        <Accordion icon={<IconSchool size={16} />} title="Kullanılan Kaynaklar">
          <div className="space-y-3">
            {(TRACK_RESOURCES[student.track] ?? Object.keys(resources)).map((subject) => {
              const filled = (resources[subject] ?? []).filter(Boolean);
              if (!filled.length) return null;
              return (
                <div key={subject}>
                  <p className="mb-1 text-[13px] font-bold text-[var(--ink)]">{subject}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filled.map((b, i) => (
                      <span key={i} className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[12px] font-bold text-[var(--accent-dark)]">{b}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Accordion>
      )}

      <GunlukAccordion studentId={student.id} />
    </div>
  );
}
