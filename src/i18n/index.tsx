import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { en } from './en';
import type { TranslationKey, Translations } from './en';
import { hi } from './hi';
import { kn } from './kn';

export type LanguageCode = 'kn' | 'hi' | 'en';

const PREF_KEY_LANGUAGE = 'app_language';

const translationsMap: Record<LanguageCode, Translations> = {
  kn,
  hi,
  en,
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<LanguageCode>('en'); // English is default

  useEffect(() => {
    // Load saved language from Preferences
    Preferences.get({ key: PREF_KEY_LANGUAGE }).then(({ value }) => {
      if (value === 'hi' || value === 'en' || value === 'kn') {
        setLangState(value);
      } else {
        setLangState('en');
      }
    });
  }, []);

  const setLanguage = useCallback(async (lang: LanguageCode) => {
    setLangState(lang);
    await Preferences.set({ key: PREF_KEY_LANGUAGE, value: lang });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const dict = translationsMap[language] || translationsMap.en;
      let text = dict[key] || translationsMap.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }

      return text;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
