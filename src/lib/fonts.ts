import { Fraunces, Inter } from 'next/font/google';

export const fraunces = Fraunces({
  subsets: ['latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
});

export const inter = Inter({
  subsets: ['latin-ext'],
  variable: '--font-body',
});