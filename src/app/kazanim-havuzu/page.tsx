// src/app/kazanim-havuzu/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KazanimHavuzuClient from "./KazanimHavuzuClient";

export default async function KazanimHavuzuPage() {
  // Not: server.ts'iniz senkron ise "await" kaldırın.
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  // Yönetici değilse sayfa hiç render edilmez
  if (!profile?.is_admin) redirect("/anasayfa");

  const { data: categories } = await supabase
    .from("exam_categories")
    .select("id, code, name")
    .order("sort_order");

  return <KazanimHavuzuClient categories={categories ?? []} />;
}