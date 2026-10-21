import { createClient } from '@supabase/supabase-js';

// SADECE sunucu tarafında (API route / server component) kullanın. Tarayıcı koduna import etmeyin.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
