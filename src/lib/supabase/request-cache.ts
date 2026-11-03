import { cache } from 'react';
import { createClient } from './server';
import { getStudentScope } from '@/lib/effective-coach';

// Aynı sayfa isteği içinde (panel iskeleti + sayfanın kendisi) tekrar tekrar sorulan bilgiler bir kez sorulur.
// React cache yalnızca o isteğin ömrü boyunca geçerlidir; kullanıcılar arasında paylaşılmaz.

/** Oturumdaki kullanıcı (Supabase Auth'a istek başına tek çağrı) */
export const getRequestUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/** Koçun görebildiği öğrenci kapsamı (istek başına tek hesap) */
export const getRequestScope = cache(async (userId: string, includeInterns: boolean) => {
  const supabase = await createClient();
  return getStudentScope(supabase, userId, includeInterns);
});
