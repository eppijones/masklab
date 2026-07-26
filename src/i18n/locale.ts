export type Locale = 'no' | 'en';

export const LOCALES: Locale[] = ['no', 'en'];

export function isLocale(v: unknown): v is Locale {
  return v === 'no' || v === 'en';
}
