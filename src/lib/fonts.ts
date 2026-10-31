import { Fraunces, Inter, Nunito } from 'next/font/google';

export const fraunces = Fraunces({
  subsets: ['latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
});

export const inter = Inter({
  subsets: ['latin-ext'],
  variable: '--font-body',
});
// Öğrenci paneli: yuvarlak hatlı, samimi bir yazı tipi
export const nunito = Nunito({
  subsets: ['latin-ext'],
  variable: '--font-student',
});
