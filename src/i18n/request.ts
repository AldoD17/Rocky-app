import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const LOCALES = ['it', 'en', 'fr', 'es', 'pt', 'de', 'nl'];
const DEFAULT = 'it';

const messageLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  it: () => import('../messages/it.json'),
  en: () => import('../messages/en.json'),
  fr: () => import('../messages/fr.json'),
  es: () => import('../messages/es.json'),
  pt: () => import('../messages/pt.json'),
  de: () => import('../messages/de.json'),
  nl: () => import('../messages/nl.json'),
};

function fromAcceptLanguage(h: string | null): string {
  if (!h) return DEFAULT;
  for (const part of h.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().split('-')[0];
    if (LOCALES.includes(tag)) return tag;
  }
  return DEFAULT;
}

export default getRequestConfig(async () => {
  const c = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = c && LOCALES.includes(c) ? c : fromAcceptLanguage((await headers()).get('accept-language'));
  const messages = (await messageLoaders[locale]()).default;
  return { locale, messages };
});
