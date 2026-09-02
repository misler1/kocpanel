export type UserRole = 'koc' | 'ogrenci' | 'veli' | 'ogretmen';
export type ExamTrack = 'YKS_SAY' | 'YKS_SOZ' | 'YKS_EA' | 'YKS_DIL' | 'LGS' | 'DIGER';
export type StudentStatus = 'aktif' | 'gorusme_bekliyor' | 'analiz_eksik' | 'dikkat' | 'pasif';
export type TodoPriority = 'dusuk' | 'orta' | 'yuksek';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_color: string;
  phone: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  profile_id: string | null;
  coach_id: string;
  full_name: string;
  track: ExamTrack;
  status: StudentStatus;
  avatar_color: string;
  notes: string | null;
  kurum: string | null;
  donem: string | null;
  created_at: string;
  updated_at: string;
}
export interface Meeting {
  id: string;
  student_id: string;
  coach_id: string;
  meeting_type: 'ogrenci' | 'veli';
  scheduled_at: string;
  duration_minutes: number;
  topic: string | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export interface Exam {
  id: string;
  student_id: string;
  exam_name: string;
  exam_date: string;
  net_score: number;
  max_score: number;
  analysis_done: boolean;
  analysis_notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  coach_id: string;
  student_id: string | null;
  title: string;
  priority: TodoPriority;
  due_date: string | null;
  completed: boolean;
  created_at: string;
}

export interface QuestionLog {
  id: string;
  student_id: string;
  subject: string;
  week_start: string;
  target_count: number;
  done_count: number;
  created_at: string;
}

export interface TopicProgress {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  status: 'baslanmadi' | 'devam' | 'tamamlandi';
  updated_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

// Supabase generated tipler için minimal Database tanımı
// (gerçek proje için `supabase gen types typescript` ile otomatik üretilebilir)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      students: { Row: Student; Insert: Partial<Student>; Update: Partial<Student> };
      meetings: { Row: Meeting; Insert: Partial<Meeting>; Update: Partial<Meeting> };
      exams: { Row: Exam; Insert: Partial<Exam>; Update: Partial<Exam> };
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      question_logs: { Row: QuestionLog; Insert: Partial<QuestionLog>; Update: Partial<QuestionLog> };
      topic_progress: { Row: TopicProgress; Insert: Partial<TopicProgress>; Update: Partial<TopicProgress> };
      conversations: { Row: Conversation; Insert: Partial<Conversation>; Update: Partial<Conversation> };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> };
      donemler: { Row: Donem; Insert: Partial<Donem>; Update: Partial<Donem> };
    };
  };
}
export interface Donem {
  id: string;
  coach_id: string;
  donem_adi: string;
  created_at: string;
}
