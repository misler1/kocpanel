/** Öğrenciler listesindeki satır özeti: son deneme ve bu haftaki program uyumu */
export type StudentSummary = {
  examType: string | null; lastNet: number | null; netDiff: number | null; examDate: string | null;
  weekDone: number; weekPlanned: number;
};
