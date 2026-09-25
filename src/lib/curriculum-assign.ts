// src/lib/curriculum-assign.ts
// Bir öğrencinin sınav türüne (track) göre Kazanım Havuzu'ndaki
// ilgili derslerin aktif konularını topic_progress'e otomatik ekler.
// Zaten eklenmiş konuları tekrar eklemez, sadece eksikleri tamamlar.
// Bu yüzden hem "öğrenci eklendiğinde" hem de "havuza yeni ders/konu
// eklendiğinde tekrar çalıştır" senaryosunda güvenle kullanılabilir.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TRACK_RESOURCES } from "@/lib/track-resources";

const norm = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

type Spec = { categoryCode: string; subjectName: string };

// "TYT Matematik" -> { categoryCode: "TYT", subjectName: "Matematik" }
// "YDT İngilizce"  -> { categoryCode: "DIL", subjectName: "İngilizce" }
// "Türkçe" (LGS listesinde önek yok) -> { categoryCode: "LGS", subjectName: "Türkçe" }
function parseTrackResources(track: string): Spec[] {
  const list = TRACK_RESOURCES[track] ?? [];
  return list.map((item) => {
    if (item.startsWith("TYT ")) return { categoryCode: "TYT", subjectName: item.slice(4) };
    if (item.startsWith("AYT ")) return { categoryCode: "AYT", subjectName: item.slice(4) };
    if (item.startsWith("YDT ")) return { categoryCode: "DIL", subjectName: item.slice(4) };
    return { categoryCode: "LGS", subjectName: item };
  });
}

// Konu ilerleyişi sayfasında ders başlığı olarak görünecek etiket.
// TYT/AYT önekini koruyoruz ki aynı ders (Matematik) karışmasın.
function subjectLabel(categoryCode: string, subjectName: string) {
  if (categoryCode === "TYT" || categoryCode === "AYT") return `${categoryCode} ${subjectName}`;
  return subjectName;
}

export async function assignCurriculumForStudent(
  supabase: any,
  studentId: string,
  track: string
): Promise<{ added: number; missingSubjects: Spec[] }> {
  const specs = parseTrackResources(track);
  if (specs.length === 0) return { added: 0, missingSubjects: [] };

  // 1) Sınav türü (kategori) id'leri
  const catCodes = [...new Set(specs.map((s) => s.categoryCode))];
  const { data: cats } = await supabase
    .from("exam_categories")
    .select("id, code")
    .in("code", catCodes);
  const catIdByCode = new Map<string, string>((cats ?? []).map((c: any) => [c.code, c.id]));
  const catIds = [...catIdByCode.values()];
  if (catIds.length === 0) return { added: 0, missingSubjects: specs };

  // 2) O kategorilerdeki dersler
  const { data: subs } = await supabase
    .from("curriculum_subjects")
    .select("id, category_id, name")
    .in("category_id", catIds);

  const codeByCatId = new Map<string, string>([...catIdByCode.entries()].map(([code, id]) => [id, code]));
  const subIdByKey = new Map<string, string>(); // "TYT|matematik" -> subject_id
  (subs ?? []).forEach((s: any) => {
    const code = codeByCatId.get(s.category_id);
    if (code) subIdByKey.set(`${code}|${norm(s.name)}`, s.id);
  });

  // 3) İstenen derslerden havuzda karşılığı bulunanlar / bulunamayanlar
  const missingSubjects: Spec[] = [];
  const subjectMeta: { subjectId: string; label: string }[] = [];
  for (const spec of specs) {
    const id = subIdByKey.get(`${spec.categoryCode}|${norm(spec.subjectName)}`);
    if (id) subjectMeta.push({ subjectId: id, label: subjectLabel(spec.categoryCode, spec.subjectName) });
    else missingSubjects.push(spec);
  }
  if (subjectMeta.length === 0) return { added: 0, missingSubjects };

  const labelBySubjectId = new Map(subjectMeta.map((s) => [s.subjectId, s.label]));
  const subjectIds = subjectMeta.map((s) => s.subjectId);

  // 4) Bu derslerin aktif konuları (500'erli sayfalar halinde, çok konu olabilir)
  const topics: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("curriculum_topics")
      .select("id, subject_id, code, name")
      .in("subject_id", subjectIds)
      .eq("is_active", true)
      .range(from, from + 999);
    if (!data?.length) break;
    topics.push(...data);
    if (data.length < 1000) break;
  }
  if (topics.length === 0) return { added: 0, missingSubjects };

  // 5) Öğrencinin zaten sahip olduğu kayıtlar (tekrar eklememek için)
  const { data: existing } = await supabase
    .from("topic_progress")
    .select("topic_id, subject, topic")
    .eq("student_id", studentId);

  const existingByTopicId = new Set((existing ?? []).map((e: any) => e.topic_id).filter(Boolean));
  const existingByText = new Set(
    (existing ?? []).map((e: any) => `${norm(e.subject)}|${norm(e.topic)}`)
  );

  // 6) Eklenecek satırları hazırla
  const rows = topics
    .filter((t) => !existingByTopicId.has(t.id))
    .map((t) => {
      const label = labelBySubjectId.get(t.subject_id)!;
      const name = t.code ? `${t.code} · ${t.name}` : t.name;
      return { key: `${norm(label)}|${norm(name)}`, label, name, topic_id: t.id };
    })
    .filter((r) => !existingByText.has(r.key))
    .map((r) => ({
      student_id: studentId,
      subject: r.label,
      topic: r.name,
      topic_id: r.topic_id,
      konu_tamamlandi: false,
      kaynak1_sorular: false,
      kaynak2_sorular: false,
      kaynak3_sorular: false,
      yanlislar_kontrol: false,
    }));

  let added = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from("topic_progress").insert(chunk);
    if (!error) added += chunk.length;
  }

  return { added, missingSubjects };
}