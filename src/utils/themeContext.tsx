/**
 * AI Writer — Theme System (Dark / Light Mode)
 *
 * Provides a React Context for app-wide theming with
 * dark and light mode support. Theme is persisted in AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Theme Colors ───────────────────────────────────────────────

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders
  border: string;
  borderLight: string;

  // Brand
  primary: string;
  primaryLight: string;
  accent: string;

  // Semantic
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;

  // Input
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;

  // StatusBar
  statusBarStyle: 'light-content' | 'dark-content';
  statusBarBg: string;

  // Shadows
  shadowColor: string;

  // Navigation header (dark bar)
  headerBg: string;
  headerText: string;
}

export const LightTheme: ThemeColors = {
  background: '#F4F4F6',
  surface: '#FFFFFF',
  surfaceAlt: '#EEEEF1',
  card: '#FFFFFF',

  textPrimary: '#1E1F23',
  textSecondary: '#35373D',
  textMuted: '#6B6D75',
  textInverse: '#FFFFFF',

  border: '#D5D5DA',
  borderLight: '#EDEDF0',

  primary: '#C8A961',
  primaryLight: '#F7F1E3',
  accent: '#C8A961',

  success: '#22C55E',
  successLight: '#E8FAF0',
  warning: '#DD6B20',
  warningLight: '#FFF3E0',
  danger: '#E53E3E',
  dangerLight: '#FFF0F0',

  inputBackground: '#FFFFFF',
  inputBorder: '#D5D5DA',
  inputText: '#1E1F23',
  placeholder: '#9D9EA2',

  statusBarStyle: 'dark-content',
  statusBarBg: '#F4F4F6',

  shadowColor: '#000000',

  headerBg: '#2C2E33',
  headerText: '#FFFFFF',
};

export const DarkTheme: ThemeColors = {
  background: '#161618',
  surface: '#2C2E33',
  surfaceAlt: '#242528',
  card: '#2C2E33',

  textPrimary: '#F0F0F2',
  textSecondary: '#C8C9CD',
  textMuted: '#9D9EA2',
  textInverse: '#161618',

  border: '#45464A',
  borderLight: '#35373D',

  primary: '#D4BA70',
  primaryLight: '#3A3427',
  accent: '#D4BA70',

  success: '#4ADE80',
  successLight: '#0F2D1A',
  warning: '#FB923C',
  warningLight: '#2D1A0A',
  danger: '#F87171',
  dangerLight: '#2D0F0F',

  inputBackground: '#2C2E33',
  inputBorder: '#45464A',
  inputText: '#F0F0F2',
  placeholder: '#6B6D75',

  statusBarStyle: 'light-content',
  statusBarBg: '#161618',

  shadowColor: '#000000',

  headerBg: '#2C2E33',
  headerText: '#F0F0F2',
};

// ─── Context ────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: LightTheme,
  setMode: () => {},
});

const THEME_STORAGE_KEY = '@ai_writer_theme_mode';

// ─── Provider ───────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const colors = isDark ? DarkTheme : LightTheme;

  if (!loaded) return null; // avoid flash of wrong theme

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
