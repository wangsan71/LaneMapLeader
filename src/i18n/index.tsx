import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setLanguage, t, detectLanguage } from './core';

export type Language = 'zh-CN' | 'zh-Hant' | 'en';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const detected = detectLanguage();
    setLanguage(detected);
    return detected;
  });

  const setLang = useCallback((newLang: Language) => {
    setLanguage(newLang);
    setLangState(newLang);
  }, []);

  const ctxT = useCallback(
    (key: string, params?: Record<string, string | number>) => t(key, params),
    []
  );

  useEffect(() => {
    setLanguage(lang);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: ctxT }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT(): (key: string, params?: Record<string, string | number>) => string {
  return useI18n().t;
}
