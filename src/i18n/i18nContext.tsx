/**
 * AI Writer — i18n (Internationalization) System
 *
 * Provides a React Context + hook for app-wide translations.
 * - Auto-detects device language on first launch
 * - Persists user language preference in AsyncStorage
 * - Falls back to English for missing translations
 * - Supports {{variable}} interpolation
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en, { TranslationKeys } from './translations/en';
import ar from './translations/ar';
import es from './translations/es';
import fr from './translations/fr';
import de from './translations/de';
import zh from './translations/zh';
import ja from './translations/ja';
import ko from './translations/ko';
import ru from './translations/ru';
import hi from './translations/hi';
import pt from './translations/pt';
import tr from './translations/tr';
import it from './translations/it';
import fa from './translations/fa';
import ur from './translations/ur';

// ─── Supported App Languages ──────────────────────────────

export interface AppLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export const APP_LANGUAGES: AppLanguageOption[] = [
  { code: 'auto', name: 'Auto (Device)', nativeName: 'Auto', direction: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'rtl' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl' },
];

// ─── Translation Map ──────────────────────────────────────

type TranslationMap = Record<string, string>;

const translations: Record<string, TranslationMap> = {
  en,
  ar,
  es,
  fr,
  de,
  zh,
  ja,
  ko,
  ru,
  hi,
  pt,
  tr,
  it,
  fa,
  ur,
};

const STORAGE_KEY = '@ai_writer_app_language';

// ─── Detect Device Language ───────────────────────────────

function detectDeviceLangCode(): string {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode;
      if (code && translations[code]) return code;
    }
  } catch (e) {
    // fallback
  }
  return 'en';
}

// ─── Context ──────────────────────────────────────────────

interface I18nContextType {
  /** Current resolved language code (never 'auto') */
  language: string;
  /** User preference ('auto' or specific code) */
  preference: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Translation function */
  t: (key: TranslationKeys, vars?: Record<string, string | number>) => string;
  /** Change language */
  setLanguage: (code: string) => void;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  preference: 'auto',
  direction: 'ltr',
  t: (key) => key,
  setLanguage: () => {},
});

export function useTranslation() {
  return useContext(I18nContext);
}

// ─── Provider ─────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<string>('auto');
  const [loaded, setLoaded] = useState(false);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setPreference(val);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  // Resolve actual language
  const resolvedLang = preference === 'auto' ? detectDeviceLangCode() : preference;
  const currentTranslations = translations[resolvedLang] || en;

  // Determine text direction and apply RTL layout
  const langInfo = APP_LANGUAGES.find((l) => l.code === resolvedLang);
  const direction = langInfo?.direction || 'ltr';
  const isRTL = direction === 'rtl';

  // Force RTL layout when using an RTL language
  useEffect(() => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
    }
  }, [isRTL]);

  // Translation function with interpolation
  const t = useCallback(
    (key: TranslationKeys, vars?: Record<string, string | number>): string => {
      let text = currentTranslations[key] || en[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [currentTranslations]
  );

  // Set language
  const setLanguage = useCallback((code: string) => {
    setPreference(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  if (!loaded) return null; // avoid flash of wrong language

  return (
    <I18nContext.Provider value={{ language: resolvedLang, preference, direction, t, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}
