/* eslint-disable @typescript-eslint/no-explicit-any */
// Öğrenci detayı > Yapay zeka asistanı: haftalık öneri, program taslağı, görüşme hazırlığı.
// Üçü de aynı veriyi kullanır: son denemeler (net gidişatı + en çok net kaybettiren kazanımlar), son 14 günün programı
// ve günlükleri, konu ilerleyişi, son görüşme notları. Sayılar kodda hesaplanır; yapay zekâ yalnızca yorumlar.
// Öğrencinin adı yapay zekâya gönderilmez.
import { callLlm, parseJsonLoose } from '@/lib/ai/llm';
import { aggregateKazanim, netTrendLines, type ExamRow } from '@/lib/groq/examAnalysis';
import { TRACK_RESOURCES } from '@/lib/track-resources';
import { addDays, weekdayOf, programLength, DAY_NAMES } from '@/lib/program-days';
import { todayTr } from '@/lib/day-tasks';

export type AssistantKind = 'haftalik' | 'program' | 'gorusme';

export type WeeklyAdvice = {
  ozet: string;
  odaklar: { baslik: string; neden: string; ne_yapmali: string }[];
  gorusmede_konus: string[];
  ogrenciye_mesaj: string;
};
export type ProgramTask = { ders: string; konu: string; soru: number; dakika: number | null };
export type ProgramDraft = {
  aciklama: string;
  /** Programın başlayacağı gün ve gün sayısı (kodda hesaplanır) */
  week_start: string;
  week_end: string;
  /** Hedef haftada zaten yazılmış görev sayısı */
  mevcut_gorev: number;
  gunler: { tarih: string; gun: string; plan_day: number; gorevler: ProgramTask[] }[];
};
export type MeetingPrep = {
  durum: string;
  iyi_gidenler: string[];
  dikkat: string[];
  sorular: string[];
  gundem: string[];
};
export type AssistantResult =
  | { kind: 'haftalik'; data: WeeklyAdvice }
  | { kind: 'program'; data: ProgramDraft }
  | { kind: 'gorusme'; data: MeetingPrep };

const TRACK_LABEL: Record<string, string> = {
  YKS_SAY: 'YKS Sayısal', YKS_EA: 'YKS Eşit Ağırlık', YKS_SOZ: 'YKS Sözel', YKS_DIL: 'YKS Dil', LGS: 'LGS', DIGER: 'Diğer',
};

type Ctx = { text: string; subjects: string[]; weekStart: string; weekEnd: string; existing: number };

const n = (v: unknown) => Number(v) || 0;
const str = (v: unknown, max = 400) => String(v ?? '').trim().slice(0, max);
const strList = (v: unknown, max = 6, len = 300) => (Array.isArray(v) ? v : []).map((x) => str(x, len)).filter(Boolean).slice(0, max);

/** Öğrencinin verisini toplayıp yapay zekâya gidecek özet metni hazırlar */
export async function buildStudentContext(db: any, student: any): Promise<Ctx> {
  const sid = student.id;
  const today = todayTr();
  const from14 = addDays(today, -14);

  const [{ data: exams }, { data: tasks }, { data: logs }, { data: topics }, { data: meetings }, { data: lastProg }] = await Promise.all([
    db.from('exams').select('id, exam_name, exam_type, exam_date, net_score, subject_results, question_results, subject_averages, tyt_puan, say_puan, ea_puan, soz_puan, lgs_puan, linked_exam_id, student_analysis')
      .eq('student_id', sid).order('exam_date', { ascending: false }).limit(6),
    db.from('question_logs').select('subject, topic, week_start, week_end, plan_day, target_count, done_count, topic_target_minutes, topic_done_minutes, student_done, appointment_id')
      .eq('student_id', sid).gte('week_start', addDays(today, -21)).lte('week_start', today),
    db.from('daily_logs').select('log_date, question_solved, topic_studies, archived')
      .eq('student_id', sid).gte('log_date', from14).lte('log_date', today),
    db.from('topic_progress').select('subject, topic, status, updated_at').eq('student_id', sid).limit(2000),
    db.from('meetings').select('scheduled_at, topic, notes, meeting_type').eq('student_id', sid)
      .lte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: false }).limit(4),
    db.from('question_logs').select('week_start, week_end').eq('student_id', sid).is('appointment_id', null)
      .order('week_start', { ascending: false }).limit(1),
  ]);

  const out: string[] = [];
  out.push(`BUGÜN: ${today} (${DAY_NAMES[weekdayOf(today)]})`);
  const target = [student.target_university, student.target_department].filter(Boolean).join(' / ');
  out.push(`ÖĞRENCİ: ${TRACK_LABEL[student.track] ?? student.track ?? '?'}${student.grade_level ? `, ${student.grade_level}` : ''}${target ? `, hedef: ${target}` : ''}${student.target_rank ? `, hedef sıralama ${student.target_rank}` : ''}`);
  const tn = student.target_nets && typeof student.target_nets === 'object' ? Object.entries(student.target_nets).filter(([, v]) => v) : [];
  if (tn.length) out.push(`Hedef netler: ${tn.map(([k, v]) => `${k} ${v}`).join(', ')}`);

  // ── Denemeler ──
  const ex: ExamRow[] = ((exams as any[]) ?? []).reverse().map((e) => ({
    ...e, net_score: String(e.net_score ?? ''), subject_results: e.subject_results ?? {},
    question_results: Array.isArray(e.question_results) ? e.question_results : null,
  }));
  out.push('');
  if (ex.length === 0) out.push('DENEMELER: kayıtlı deneme yok.');
  else {
    out.push(`DENEMELER (eskiden yeniye, son ${ex.length}):`);
    for (const e of ex) out.push(`  • ${e.exam_date} ${e.exam_type} ${e.exam_name}: ${e.net_score} net`);
    const trends = netTrendLines(ex);
    if (trends.length) { out.push('Net gidişatı (kodda hesaplandı):'); out.push(...trends); }
    const last = ex[ex.length - 1];
    const sr = Object.entries(last.subject_results ?? {}).map(([k, v]: [string, any]) => `${k} ${v?.dogru || 0}D/${v?.yanlis || 0}Y`).join(', ');
    if (sr) out.push(`Son deneme ders sonuçları: ${sr}`);
    const { zayif, withData } = aggregateKazanim(ex);
    if (withData > 0 && zayif.length) {
      out.push('En çok net kaybettirilen kazanımlar (karnelerden, kodda hesaplandı):');
      for (const r of zayif.slice(0, 12)) out.push(`  - ${r.ders} · ${r.kazanim}: ${r.soru} soru, ${r.dogru}D ${r.yanlis}Y ${r.bos}B (kayıp ${r.kayip} net)`);
    }
  }

  // ── Son 14 günün programı ──
  const plan = new Map<string, { gorev: number; yapilan: number; hedefSoru: number; cozulen: number }>();
  for (const t of ((tasks as any[]) ?? [])) {
    if (t.appointment_id) continue;
    const len = programLength(t.week_start, t.week_end);
    let date: string | null = null;
    for (let k = 0; k < len; k++) { const d = addDays(t.week_start, k); if (weekdayOf(d) === t.plan_day) { date = d; break; } }
    if (!date || date < from14 || date >= today) continue;
    const key = str(t.subject, 60) || 'Diğer';
    const p = plan.get(key) ?? { gorev: 0, yapilan: 0, hedefSoru: 0, cozulen: 0 };
    p.gorev++;
    if (t.student_done || n(t.done_count) > 0 || n(t.topic_done_minutes) > 0) p.yapilan++;
    p.hedefSoru += n(t.target_count); p.cozulen += n(t.done_count);
    plan.set(key, p);
  }
  out.push('');
  if (plan.size === 0) out.push('SON 14 GÜN PROGRAM: program yazılmamış.');
  else {
    const tot = [...plan.values()].reduce((a, p) => ({ g: a.g + p.gorev, y: a.y + p.yapilan }), { g: 0, y: 0 });
    out.push(`SON 14 GÜN PROGRAM (bugün hariç): ${tot.y}/${tot.g} görev yapıldı (%${Math.round((tot.y / Math.max(1, tot.g)) * 100)})`);
    for (const [s, p] of [...plan.entries()].sort((a, b) => b[1].gorev - a[1].gorev)) {
      out.push(`  - ${s}: ${p.yapilan}/${p.gorev} görev${p.hedefSoru ? `, hedef ${p.hedefSoru} soru, çözülen ${p.cozulen}` : ''}`);
    }
  }

  // ── Günlükler ──
  const study = new Map<string, { soru: number; dk: number }>();
  let logDays = 0;
  for (const l of ((logs as any[]) ?? [])) {
    if (l.archived) continue;
    logDays++;
    for (const q of Array.isArray(l.question_solved) ? l.question_solved : []) {
      const k = str(q?.subject, 60); if (!k) continue;
      const c = study.get(k) ?? { soru: 0, dk: 0 }; c.soru += n(q?.count); study.set(k, c);
    }
    for (const t of Array.isArray(l.topic_studies) ? l.topic_studies : []) {
      const k = str(t?.subject, 60); if (!k) continue;
      const c = study.get(k) ?? { soru: 0, dk: 0 }; c.dk += n(t?.duration_minutes); study.set(k, c);
    }
  }
  out.push(`SON 14 GÜN GÜNLÜK: ${logDays} gün günlük girilmiş.`);
  for (const [s, c] of [...study.entries()].sort((a, b) => b[1].soru - a[1].soru).slice(0, 14)) {
    out.push(`  - ${s}: ${c.soru} soru${c.dk ? `, ${c.dk} dk konu çalışması` : ''}`);
  }

  // ── Konu ilerleyişi ──
  const tp = (topics as any[]) ?? [];
  if (tp.length) {
    const bySub = new Map<string, { bitti: number; devam: number; yok: number }>();
    for (const t of tp) {
      const c = bySub.get(t.subject) ?? { bitti: 0, devam: 0, yok: 0 };
      if (t.status === 'tamamlandi') c.bitti++; else if (t.status === 'devam') c.devam++; else c.yok++;
      bySub.set(t.subject, c);
    }
    out.push('');
    out.push('KONU İLERLEYİŞİ (ders: bitti/devam/başlanmadı):');
    for (const [s, c] of bySub) out.push(`  - ${s}: ${c.bitti}/${c.devam}/${c.yok}`);
    const devam = tp.filter((t) => t.status === 'devam').sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 12);
    if (devam.length) out.push(`Devam eden konular: ${devam.map((t) => `${t.subject} ${t.topic}`).join('; ')}`);
  }

  // ── Görüşmeler ──
  const ms = ((meetings as any[]) ?? []).filter((m) => (m.notes || m.topic));
  out.push('');
  if (!ms.length) out.push('GÖRÜŞME NOTLARI: yok.');
  else {
    out.push('SON GÖRÜŞME NOTLARI (yeniden eskiye):');
    for (const m of ms) {
      out.push(`  • ${String(m.scheduled_at).slice(0, 10)}${m.meeting_type === 'veli' ? ' (veli görüşmesi)' : ''}: ${[m.topic, m.notes].filter(Boolean).join(' – ').replace(/\s+/g, ' ').slice(0, 600)}`);
    }
  }

  // ── Taslağın yazılacağı program haftası (toplu programdaki kuralla aynı) ──
  const lp = (lastProg as any[])?.[0];
  let weekStart = today;
  let len = 7;
  if (lp) {
    len = programLength(lp.week_start, lp.week_end);
    weekStart = addDays(lp.week_start, 7);
    while (addDays(weekStart, len - 1) < today) weekStart = addDays(weekStart, 7);
  }
  const weekEnd = addDays(weekStart, len - 1);
  const { count } = await db.from('question_logs').select('id', { count: 'exact', head: true })
    .eq('student_id', sid).eq('week_start', weekStart).is('appointment_id', null);

  return { text: out.join('\n'), subjects: TRACK_RESOURCES[student.track] ?? [], weekStart, weekEnd, existing: count ?? 0 };
}

const BASE = `Sen deneyimli bir YKS/LGS eğitim koçunun yardımcısısın. Koça, öğrencisi hakkında kısa ve uygulanabilir öneriler verirsin.
Kurallar:
- Yalnızca verilen veriye dayan; sayı uydurma. Verilen sayıları aynen kullan. Veri yoksa bunu söyle, tahmin yürütme.
- Türkçe, sade ve net yaz. Kısa cümleler. Süslü giriş, övgü kalıbı, emoji kullanma.
- Genel geçer tavsiye ("düzenli çalış", "motivasyonunu koru") yazma; her madde bu öğrencinin verisindeki somut bir duruma bağlı olsun.
- Yalnızca istenen JSON nesnesini döndür.`;

function promptFor(kind: AssistantKind, ctx: Ctx) {
  if (kind === 'haftalik') {
    return {
      system: `${BASE}
Görev: Önümüzdeki hafta için koça odak önerisi.
JSON biçimi:
{"ozet": "durumun 2-3 cümlelik özeti",
 "odaklar": [{"baslik": "kısa başlık", "neden": "veriye dayalı gerekçe (sayılarla)", "ne_yapmali": "somut iş: hangi konu, kaç soru/kaç dk, hangi gün sıklığı"}],
 "gorusmede_konus": ["koçun öğrenciyle konuşması gereken konu"],
 "ogrenciye_mesaj": "koçun öğrenciye gönderebileceği 2-3 cümlelik, sen diliyle yazılmış mesaj (isim kullanma)"}
odaklar 3-5 madde, gorusmede_konus 2-4 madde.`,
      user: ctx.text,
    };
  }
  if (kind === 'program') {
    const days = Array.from({ length: Math.round((Date.parse(ctx.weekEnd) - Date.parse(ctx.weekStart)) / 86_400_000) + 1 }, (_, k) => {
      const d = addDays(ctx.weekStart, k);
      return `${k + 1}. gün: ${d} ${DAY_NAMES[weekdayOf(d)]}`;
    });
    return {
      system: `${BASE}
Görev: Öğrencinin bir sonraki program haftası için günlük görev taslağı hazırla. Koç düzenleyip onaylayacak.
- Ağırlığı en çok net kaybettirilen konulara ve programda geride kalınan derslere ver; güçlü dersleri tamamen bırakma.
- Önceki haftalarda öğrencinin yapabildiği görev ve soru sayısını dikkate al; yapılabilir bir yük ver (gerçekleşme düşükse yükü azalt).
- Her gün 2-4 görev. Haftada bir gün daha hafif olsun.
- "ders" alanı mümkünse şu listeden birebir seçilsin: ${ctx.subjects.join(', ') || 'serbest'}.
- "konu" kısa olsun (ör. "Üslü sayılar", "Paragraf"). "soru" soru hedefi (konu çalışmasıysa 0), "dakika" konu çalışma süresi (soru görevi ise null).
JSON biçimi:
{"aciklama": "taslağın mantığını anlatan 1-2 cümle",
 "gunler": [{"gun": 1, "gorevler": [{"ders": "...", "konu": "...", "soru": 40, "dakika": null}]}]}
Program günleri:
${days.join('\n')}`,
      user: ctx.text,
    };
  }
  return {
    system: `${BASE}
Görev: Koç birazdan bu öğrenciyle görüşecek. Görüşme hazırlık notu çıkar.
JSON biçimi:
{"durum": "son durumun 2-3 cümlelik özeti",
 "iyi_gidenler": ["takdir edilebilecek somut gelişme"],
 "dikkat": ["dikkat edilmesi gereken somut sorun (sayılarla)"],
 "sorular": ["koçun öğrenciye sorabileceği açık uçlu soru"],
 "gundem": ["görüşmede sırayla ele alınacak başlık"]}
Her liste 2-5 madde. Önceki görüşmede konuşulanların takibi varsa gündeme ekle.`,
    user: ctx.text,
  };
}

/** Yapay zekâyı çağırır ve yanıtı doğrulayıp temizler */
export async function runAssistant(kind: AssistantKind, ctx: Ctx): Promise<{ result: AssistantResult; provider: string }> {
  const { system, user } = promptFor(kind, ctx);
  const res = await callLlm({ system, user, maxTokens: kind === 'program' ? 5000 : 2500 });
  const raw = parseJsonLoose<any>(res.text);

  if (kind === 'haftalik') {
    const data: WeeklyAdvice = {
      ozet: str(raw?.ozet, 800),
      odaklar: (Array.isArray(raw?.odaklar) ? raw.odaklar : []).slice(0, 6).map((o: any) => ({
        baslik: str(o?.baslik, 120), neden: str(o?.neden, 500), ne_yapmali: str(o?.ne_yapmali, 500),
      })).filter((o: any) => o.baslik),
      gorusmede_konus: strList(raw?.gorusmede_konus, 5),
      ogrenciye_mesaj: str(raw?.ogrenciye_mesaj, 600),
    };
    if (!data.ozet && !data.odaklar.length) throw new Error('Yapay zekâ boş bir öneri döndürdü. Lütfen tekrar deneyin.');
    return { result: { kind, data }, provider: res.provider };
  }

  if (kind === 'program') {
    const len = Math.round((Date.parse(ctx.weekEnd) - Date.parse(ctx.weekStart)) / 86_400_000) + 1;
    const gunler: ProgramDraft['gunler'] = Array.from({ length: len }, (_, k) => {
      const tarih = addDays(ctx.weekStart, k);
      return { tarih, gun: DAY_NAMES[weekdayOf(tarih)], plan_day: weekdayOf(tarih), gorevler: [] };
    });
    // Ders adı listede büyük/küçük harf farkıyla geçiyorsa listedekine çevrilir
    const canon = new Map(ctx.subjects.map((s) => [s.toLocaleLowerCase('tr'), s]));
    for (const g of Array.isArray(raw?.gunler) ? raw.gunler : []) {
      const idx = Math.round(n(g?.gun)) - 1;
      if (idx < 0 || idx >= len) continue;
      for (const t of (Array.isArray(g?.gorevler) ? g.gorevler : []).slice(0, 6)) {
        const ders = str(t?.ders, 60);
        if (!ders) continue;
        const soru = Math.max(0, Math.min(500, Math.round(n(t?.soru))));
        const dk = t?.dakika == null ? null : Math.max(0, Math.min(600, Math.round(n(t?.dakika)))) || null;
        gunler[idx].gorevler.push({ ders: canon.get(ders.toLocaleLowerCase('tr')) ?? ders, konu: str(t?.konu, 120), soru, dakika: dk });
      }
    }
    if (!gunler.some((g) => g.gorevler.length)) throw new Error('Yapay zekâ program taslağı üretemedi. Lütfen tekrar deneyin.');
    return {
      result: { kind, data: { aciklama: str(raw?.aciklama, 600), week_start: ctx.weekStart, week_end: ctx.weekEnd, mevcut_gorev: ctx.existing, gunler } },
      provider: res.provider,
    };
  }

  const data: MeetingPrep = {
    durum: str(raw?.durum, 800),
    iyi_gidenler: strList(raw?.iyi_gidenler),
    dikkat: strList(raw?.dikkat),
    sorular: strList(raw?.sorular),
    gundem: strList(raw?.gundem),
  };
  if (!data.durum && !data.gundem.length) throw new Error('Yapay zekâ boş bir not döndürdü. Lütfen tekrar deneyin.');
  return { result: { kind, data }, provider: res.provider };
}
