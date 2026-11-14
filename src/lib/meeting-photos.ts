/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server';

// Görüşme defter fotoğrafları: ortak sunucu yardımcıları (api/gorusme/foto)
export const BUCKET = 'gorusme-fotolari';
export const PATH_RE = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|heic|heif)$/;
export const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

/** Oturum açık ve öğrenciyi görebiliyor mu? */
export async function canSeeStudent(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await (supabase as any).from('students').select('id').eq('id', studentId).maybeSingle();
  return !!data;
}

export function studentOfPath(path: string | null): string | null {
  const m = path ? PATH_RE.exec(path) : null;
  return m ? m[1] : null;
}

