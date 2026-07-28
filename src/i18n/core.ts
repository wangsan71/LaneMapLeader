import { translations } from './translations';
import type { Language } from './index';

let _lang: Language = 'zh-CN';
let _map: Record<string, string> = translations['zh-CN'];

export function setLanguage(lang: Language) {
  _lang = lang;
  _map = translations[lang];
}

export function getLanguage(): Language {
  return _lang;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = _map[key];
  if (text === undefined) return key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function detectLanguage(): Language {
  if (typeof window === 'undefined') return 'zh-CN';
  const lang = navigator.language || '';
  if (lang.startsWith('zh-Hant') || lang.startsWith('zh-TW') || lang.startsWith('zh-HK') || lang.startsWith('zh-MO')) {
    return 'zh-Hant';
  }
  if (lang.startsWith('zh')) return 'zh-CN';
  if (lang.startsWith('en')) return 'en';
  return 'zh-CN';
}
