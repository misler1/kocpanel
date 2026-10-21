'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { IconUsers, IconSchool } from '@tabler/icons-react';
import {
  Accordion, InfoRow, GunlukAccordion, TRACK_LABELS, TRACK_RESOURCES,
} from '../ogrenciler/[id]/OgrenciDetayClient';

// Öğrencinin kendi bilgileri (salt okunur) + Günlük. Koç sayfasındaki bileşenlerin aynısı kullanılır,
// böylece iki taraf birbirinden ayrışmaz.
export function OgrenciBilgilerClient({ student }: { student: any }) {
  const birth = student.birth_date
    ? new Date(student.birth_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const resources: Record<string, [string, string, string]> = student.resources ?? {};
  const hasResources = Object.values(resources).some((arr) => arr.some(Boolean));
  const hasGuardian = student.guardian_name || student.mother_name || student.father_name;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
        <h2 className="text-lg font-medium text-gray-900">{student.full_name}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{TRACK_LABELS[student.track] ?? student.track}</p>
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Temel Bilgiler</p>
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
                  <p className="mb-1 text-[12px] font-medium text-gray-700">{subject}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filled.map((b, i) => (
                      <span key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[12px] text-blue-700">{b}</span>
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
