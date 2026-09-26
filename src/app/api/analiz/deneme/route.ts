import { createClient } from '@/lib/supabase/server';

// POST body: { examIds: string[], examNames: string[], examDates: string[], studentIds: string[], analysis: any }
//
// Yapay zeka analiz sonucunu, karşılaştırmaya dahil olan HER öğrenci için
// ayrı bir satır olarak `exam_analyses` tablosuna yazar. Böylece öğrenci
// detay sayfasında "geçmiş analizler" listesi tarih + deneme adlarıyla
// birlikte gösterilebilir.
interface StudentAnalysis {
  student_name: string;
  guclu_dersler: string[];
  zayif_dersler: string[];
  trend: string;
  capraz_degerlendirme: string | null;
  oneriler: string[];
}

interface ExamAnalysisResult {
  ogrenciler: StudentAnalysis[];
  karsilastirma: string | null;
}

export async function POST(req: Request) {
  try {
    const {
      examIds,
      examNames,
      examDates,
      studentIds,
      analysis,
    }: {
      examIds: string[];
      examNames: string[];
      examDates: string[];
      studentIds: string[];
      analysis: ExamAnalysisResult;
    } = await req.json();

    if (!Array.isArray(examIds) || examIds.length === 0 || !analysis) {
      return Response.json({ error: 'Eksik veri' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Oturum bulunamadı.' }, { status: 401 });

    // Öğrenci isimlerini çek — Groq çıktısındaki `student_name` alanıyla
    // eşleştirip her öğrencinin KENDİ analiz metnini kaydedebilmek için.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studentRows } = await (supabase as any)
      .from('students').select('id, full_name')
      .in('id', studentIds ?? []);

    const rows = (studentRows ?? []).map((s: { id: string; full_name: string }) => {
      const matching = analysis.ogrenciler.find((o) => o.student_name === s.full_name);
      return {
        coach_id: user.id,
        student_id: s.id,
        exam_ids: examIds,
        exam_names: examNames ?? [],
        exam_dates: examDates ?? [],
        analysis: {
          ...(matching ?? {}),
          karsilastirma: analysis.karsilastirma ?? null,
        },
      };
    });

    if (rows.length === 0) {
      return Response.json({ error: 'Eşleşen öğrenci bulunamadı.' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('exam_analyses').insert(rows);
    if (error) {
      // Tablo henüz oluşturulmamışsa burada 42P01 hatası dönebilir — istemci
      // tarafı bu durumu sessizce yok sayıyor, kullanıcı analiz sonucunu
      // yine de görüyor, sadece kalıcı kayıt oluşmuyor.
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('Analiz kaydetme hatası:', err);
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    return Response.json({ error: message }, { status: 500 });
  }
}