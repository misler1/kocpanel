-- ============================================================
-- Görüşme taslakları her cihazda: kaydedilmemiş görüşme notu (konu, not, süre, fotoğraflar) sunucuda da saklanır.
-- Bilgisayarda başlanan taslak telefonda (ve tersi) açılınca geri gelir. Taslağı yalnızca yazan kişi görür.
-- Görüşme kaydedilince ya da "Taslağı sil" ile taslak silinir. Kod: src/lib/meetingDraft.ts
-- Supabase SQL Editor'da BİR KEZ çalıştırın; tekrar çalıştırmak zararsızdır.
--
-- Geri alma: drop table if exists public.meeting_drafts;
-- ============================================================

create table if not exists public.meeting_drafts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  draft_key text not null check (length(draft_key) <= 200),
  student_id uuid references public.students(id) on delete cascade,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, draft_key)
);
create index if not exists idx_meeting_drafts_student on public.meeting_drafts(user_id, student_id);

alter table public.meeting_drafts enable row level security;

drop policy if exists meeting_drafts_own on public.meeting_drafts;
create policy meeting_drafts_own on public.meeting_drafts for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.meeting_drafts from public, anon;
grant select, insert, update, delete on public.meeting_drafts to authenticated;

notify pgrst, 'reload schema';
