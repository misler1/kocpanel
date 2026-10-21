/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Herkese açık: kayıt formunda koç seçimi için yalnızca onaylı koçların id + adı döner.
export async function GET() {
  const admin = createAdminClient();
  const { data } = await (admin as any)
    .from('profiles').select('id, full_name')
    .eq('role', 'koc').eq('is_approved', true).order('full_name');
  return NextResponse.json({ coaches: data ?? [] });
}
