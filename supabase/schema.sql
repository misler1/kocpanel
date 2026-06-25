-- ============================================================
-- KoçPanel Veritabanı Şeması
-- ============================================================

-- Kullanıcı rolleri: koc, ogrenci, veli, ogretmen
create type user_role as enum ('koc', 'ogrenci', 'veli', 'ogretmen');
create type exam_track as enum ('YKS_SAY', 'YKS_SOZ', 'YKS_EA', 'YKS_DIL', 'LGS', 'DIGER');
create type student_status as enum ('aktif', 'gorusme_bekliyor', 'analiz_eksik', 'dikkat', 'pasif');
create type todo_priority as enum ('dusuk', 'orta', 'yuksek');

-- ============================================================
-- PROFILES — auth.users tablosuna 1-1 bağlı ek bilgiler
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  avatar_color text default 'av-blue',
  phone text,
  created_at timestamptz default now()
);

-- ============================================================
-- STUDENTS — öğrenci kayıtları, koça bağlı
-- ============================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null, -- öğrencinin kendi giriş hesabı varsa
  coach_id uuid not null references profiles(id) on delete cascade,
  full_name text not null,
  track exam_track not null default 'DIGER',
  status student_status not null default 'aktif',
  avatar_color text default 'av-blue',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Öğrenci - Veli ilişkisi (çoka-çok, bir öğrencinin birden fazla velisi olabilir)
create table student_parents (
  student_id uuid references students(id) on delete cascade,
  parent_id uuid references profiles(id) on delete cascade,
  primary key (student_id, parent_id)
);

-- Öğrenci - Öğretmen ilişkisi (bir öğrenciyle birden fazla öğretmen ilgilenebilir)
create table student_teachers (
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid references profiles(id) on delete cascade,
  subject text, -- örn: "Matematik"
  primary key (student_id, teacher_id)
);

-- ============================================================
-- MEETINGS — görüşme kayıtları (koç-öğrenci, koç-veli)
-- ============================================================
create table meetings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  coach_id uuid not null references profiles(id) on delete cascade,
  meeting_type text not null default 'ogrenci', -- 'ogrenci' | 'veli'
  scheduled_at timestamptz not null,
  duration_minutes int default 30,
  topic text,
  notes text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- EXAMS (Denemeler) — deneme sınav sonuçları
-- ============================================================
create table exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  exam_name text not null,        -- "TYT Dijital", "LGS Denemesi"
  exam_date date not null,
  net_score numeric(5,2) not null,
  max_score numeric(5,2) default 120,
  analysis_done boolean default false,
  analysis_notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- TASKS (Yapılacaklar / Todos) — koçun takip listesi
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  title text not null,
  priority todo_priority default 'orta',
  due_date date,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- QUESTION TRACKING (Soru takibi) — haftalık soru çözüm takibi
-- ============================================================
create table question_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,         -- "Matematik", "Türkçe" vb.
  week_start date not null,
  target_count int not null default 0,
  done_count int not null default 0,
  created_at timestamptz default now(),
  unique (student_id, subject, week_start)
);

-- ============================================================
-- TOPIC PROGRESS (Konu ilerleyişi)
-- ============================================================
create table topic_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,
  topic text not null,
  status text not null default 'baslanmadi', -- 'baslanmadi' | 'devam' | 'tamamlandi'
  updated_at timestamptz default now()
);

-- ============================================================
-- MESSAGES — koç/öğrenci/öğretmen mesajlaşma (sonraki aşama, şimdiden hazır)
-- ============================================================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table conversation_participants (
  conversation_id uuid references conversations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_students_coach on students(coach_id);
create index idx_meetings_coach on meetings(coach_id);
create index idx_meetings_student on meetings(student_id);
create index idx_exams_student on exams(student_id);
create index idx_tasks_coach on tasks(coach_id);
create index idx_question_logs_student on question_logs(student_id);
create index idx_messages_conversation on messages(conversation_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table students enable row level security;
alter table student_parents enable row level security;
alter table student_teachers enable row level security;
alter table meetings enable row level security;
alter table exams enable row level security;
alter table tasks enable row level security;
alter table question_logs enable row level security;
alter table topic_progress enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Profiles: herkes kendi profilini görebilir/güncelleyebilir
create policy "profiles_self_select" on profiles for select using (auth.uid() = id);
create policy "profiles_self_update" on profiles for update using (auth.uid() = id);
create policy "profiles_self_insert" on profiles for insert with check (auth.uid() = id);

-- Students: koç sadece kendi öğrencilerini yönetir
create policy "students_coach_all" on students for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Öğrencinin kendisi kendi kaydını görebilir
create policy "students_self_select" on students for select
  using (profile_id = auth.uid());

-- Veli kendi öğrencisini görebilir
create policy "students_parent_select" on students for select
  using (
    exists (
      select 1 from student_parents sp
      where sp.student_id = students.id and sp.parent_id = auth.uid()
    )
  );

-- Meetings, exams, tasks, question_logs, topic_progress: koç kendi öğrencileri için CRUD
create policy "meetings_coach_all" on meetings for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "exams_coach_all" on exams for all
  using (exists (select 1 from students s where s.id = exams.student_id and s.coach_id = auth.uid()))
  with check (exists (select 1 from students s where s.id = exams.student_id and s.coach_id = auth.uid()));

create policy "tasks_coach_all" on tasks for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy "question_logs_coach_all" on question_logs for all
  using (exists (select 1 from students s where s.id = question_logs.student_id and s.coach_id = auth.uid()))
  with check (exists (select 1 from students s where s.id = question_logs.student_id and s.coach_id = auth.uid()));

create policy "topic_progress_coach_all" on topic_progress for all
  using (exists (select 1 from students s where s.id = topic_progress.student_id and s.coach_id = auth.uid()))
  with check (exists (select 1 from students s where s.id = topic_progress.student_id and s.coach_id = auth.uid()));

-- Messages: sadece konuşmaya katılanlar görebilir/yazabilir
create policy "conversations_participant_select" on conversations for select
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = conversations.id and cp.profile_id = auth.uid()));

create policy "participants_select" on conversation_participants for select
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_participants.conversation_id and cp.profile_id = auth.uid()));

create policy "messages_participant_select" on messages for select
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid()));

create policy "messages_participant_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid())
  );
