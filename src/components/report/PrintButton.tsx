'use client';

import { IconFileTypePdf } from '@tabler/icons-react';

/** Tarayıcının yazdırma penceresini açar; "PDF olarak kaydet" ile karne PDF'i alınır. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-blue-700">
      <IconFileTypePdf size={16} /> PDF indir / Yazdır
    </button>
  );
}
