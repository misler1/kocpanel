import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconArrowLeft, IconArrowRight, IconBook, IconBooks, IconBrain,
  IconBriefcase, IconChartBar, IconCheck, IconChevronRight,
  IconFileCertificate, IconHeart, IconMapPin, IconSchool,
  IconTargetArrow, IconUser, IconUsers,
} from '@tabler/icons-react';
import styles from '../coaches.module.css';

export const metadata: Metadata = {
  title: 'Musa İşler | Psikolojik Danışman ve Eğitim Koçu | KoçDefterim',
  description: 'Psikolojik Danışman Musa İşler’in eğitimi, mesleki deneyimi ve LGS, YKS eğitim koçluğu çalışmaları. Ümraniye’de yüz yüze, tüm Türkiye’ye online görüşmeler.',
  alternates: { canonical: '/koclarimiz/musa-isler' },
};

const certificates = [
  'Sınav Koçluğu Eğitimi', 'Akademik Koçluk Eğitimi',
  'Bilişsel Davranışçı Terapiler Eğitimi', 'Aile Terapisi Eğitimi',
  'Cinsel Terapi Eğitimi', 'Çözüm Odaklı Terapi Eğitimi', 'Oyun Terapisi Eğitimi',
];
const experiences = [
  'Özel eğitim kurumlarında okul psikolojik danışmanlığı',
  'Farklı yaş gruplarındaki öğrencilerin akademik ve sosyal gelişimlerinin takibi',
  'Öğrenci, veli ve öğretmenlerle rehberlik görüşmeleri',
  'Çocuk, ergen ve yetişkinlere yönelik psikolojik danışmanlık',
];
const areas = [
  { title: 'Sınavlara Hazırlık', icon: IconBooks, tone: styles.peach, items: ['LGS Eğitim Koçluğu', 'YKS Eğitim Koçluğu (TYT ve AYT)', 'Akademik koçluk ve bireysel öğrenci takibi'] },
  { title: 'Akademik Planlama ve Takip', icon: IconChartBar, tone: styles.sage, items: ['Öğrenciye özel çalışma planı', 'Deneme sonuçları ve akademik gelişimin takibi', 'Konu eksiklerinin ve çalışma önceliklerinin belirlenmesi', 'Hedef belirleme ve zaman yönetimi', 'Verimli çalışma alışkanlıkları'] },
  { title: 'Psikolojik ve Bireysel Gelişim', icon: IconBrain, tone: styles.blue, items: ['Sınav kaygısı ve stres yönetimi', 'Motivasyon ve çalışma düzeni', 'Öğrenci-veli danışmanlığı'] },
];

export default function MusaIslerPage() {
  return (
    <main className={styles.profile}>
      <Link href="/koclarimiz" className={styles.backLink}><IconArrowLeft size={17} aria-hidden="true" /> Koçlarımız</Link>
      <section className={styles.hero} aria-labelledby="coach-name">
        <div className={styles.portraitFrame}>
          <Image src="/images/musa-isler-portre.webp" alt="Psikolojik Danışman ve Eğitim Koçu Musa İşler" width={320} height={400} priority unoptimized className={styles.heroPortrait} />
        </div>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Eğitim Koçu</p>
          <h1 id="coach-name">Musa İşler</h1>
          <h2>Psikolojik Danışman<br />Eğitim Koçu</h2>
          <p className={styles.heroLead}>Akademik hedeflerinize ilerlerken, çalışma düzeninizi birlikte oluşturuyoruz.</p>
          <p>Öğrencinin yalnızca derslerdeki durumunu değil, çalışma alışkanlıklarını, motivasyonunu ve sınav sürecinde yaşadığı güçlükleri de dikkate alıyorum. LGS, YKS ve akademik takip çalışmalarında hedeflerine uygun, sürdürebileceği bir yol haritası oluşturmasına destek oluyorum.</p>
          <div className={styles.tags}>
            {['LGS', 'YKS', 'Eğitim Koçluğu', 'Akademik Koçluk', 'Sınav Kaygısı Desteği'].map((tag, index) => <span key={tag} className={[styles.peach, styles.sage, styles.blue, styles.rose, styles.blue][index]}>{tag}</span>)}
          </div>
        </div>
      </section>
      <div className={styles.overview}>
        <section className={styles.about} aria-labelledby="about-title">
          <h2 id="about-title" className={styles.sectionTitle}><IconUser aria-hidden="true" /> Hakkımda</h2>
          <p>2014 yılında Marmara Üniversitesi Psikolojik Danışmanlık ve Rehberlik Bölümünden mezun oldum. Lisans eğitimimin ardından öğrencilerin akademik ve duygusal gelişimlerini destekleyen çalışmalara odaklandım. St. Clements University’de Klinik Psikoloji yüksek lisans programına devam ediyorum.</p>
          <p>Mesleki deneyimimin önemli bir bölümünü özel eğitim kurumlarındaki çalışmalarım oluşturuyor. Farklı yaş gruplarından öğrencilerin gelişimini takip ederken öğrenci, veli ve öğretmenlerle rehberlik görüşmeleri yürüttüm. Sınava hazırlık sürecinde öğrencinin ihtiyaçlarını anlamak için yalnızca sonuçlarına bakmanın yeterli olmadığını düşünüyorum.</p>
          <p>Bir öğrencinin konu eksiği olabilir; bir başkası bildiklerini denemede kullanmakta zorlanabilir. Çalışma planını bu ihtiyaçlarla birlikte ele alıyorum. Akademik planlama, motivasyon, zaman yönetimi ve sınav kaygısını birlikte değerlendirerek öğrencinin etkili çalışma alışkanlıkları kazanmasını hedefliyorum.</p>
          <blockquote>Eğitim koçluğunda amacım, öğrencinin yalnızca bir sınavda başarılı olması değil; kendi çalışma düzenini tanıması ve sürdürebileceği alışkanlıklar kazanmasıdır.</blockquote>
        </section>
        <aside className={styles.sidebar} aria-label="Eğitim ve görüşme bilgileri">
          <div className={styles.facts}>
            <div className={styles.fact}><IconSchool aria-hidden="true" /><div><h3>Marmara Üniversitesi</h3><p>Psikolojik Danışmanlık ve Rehberlik<br />(2014)</p></div></div>
            <div className={styles.fact}><IconBook aria-hidden="true" /><div><h3>St. Clements University</h3><p>Klinik Psikoloji<br />(Devam ediyor)</p></div></div>
            <div className={styles.fact}><IconMapPin aria-hidden="true" /><div><h3>Ümraniye, İstanbul</h3><p>Ümraniye Yüz yüze, Tüm Türkiye online</p></div></div>
            <Link href="/hizmetlerimiz" className={styles.servicesLink}>Koçluk hizmetleri <IconArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <blockquote className={styles.sideQuote}>Her öğrencinin ihtiyaçları farklıdır. Çalışma planı da bu farklılıkları dikkate almalıdır.</blockquote>
          <div className={styles.values}>
            <div><IconUsers aria-hidden="true" /><span>Öğrenci<br />Odaklı</span></div>
            <div><IconHeart aria-hidden="true" /><span>Bütüncül<br />Yaklaşım</span></div>
            <div><IconChartBar aria-hidden="true" /><span>Sürdürülebilir<br />Çalışma</span></div>
          </div>
        </aside>
      </div>
      <div className={styles.details}>
        <section aria-labelledby="education-title">
          <h2 id="education-title" className={styles.sectionTitle}><IconSchool aria-hidden="true" /> Eğitim</h2>
          <div className={styles.timeline}>
            <div><h3>Lisans</h3><p>Marmara Üniversitesi<br />Psikolojik Danışmanlık ve Rehberlik<br />(2014)</p></div>
            <div><h3>Yüksek Lisans</h3><p>St. Clements University<br />Klinik Psikoloji<br />(Devam ediyor)</p></div>
          </div>
        </section>
        <section aria-labelledby="experience-title">
          <h2 id="experience-title" className={styles.sectionTitle}><IconBriefcase aria-hidden="true" /> Mesleki Deneyim</h2>
          <ul className={styles.experienceList}>{experiences.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section aria-labelledby="certificates-title">
          <h2 id="certificates-title" className={styles.sectionTitle}><IconFileCertificate aria-hidden="true" /> Eğitim ve Sertifikalar</h2>
          <ul className={styles.certificateList}>{certificates.map((item) => <li key={item}><IconCheck size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>
        </section>
      </div>
      <section className={styles.work} aria-labelledby="work-title">
        <h2 id="work-title" className={styles.sectionTitle}><IconTargetArrow aria-hidden="true" /> Eğitim ve Sınav Koçluğu Çalışma Alanları</h2>
        <div className={styles.workGrid}>{areas.map(({ title, icon: Icon, tone, items }) => (
          <article key={title} className={`${styles.workArea} ${tone}`}>
            <h3><Icon size={28} aria-hidden="true" />{title}</h3>
            <ul>{items.map((item) => <li key={item}><IconChevronRight size={16} aria-hidden="true" /><span>{item}</span></li>)}</ul>
          </article>
        ))}</div>
      </section>
    </main>
  );
}
