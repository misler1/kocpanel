// src/types.ts
export interface Student {
  id: string;
  full_name: string;
}

export interface ProgramRow {
  id?: string;
  start_time: string;
  lesson_name: string;
  subject_name: string;
  target_text: string;
}