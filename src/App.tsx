/**
 * AI Writer — App Entry Point
 *
 * Root component that renders the navigation stack
 * wrapped in the ThemeProvider for dark/light mode support.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from './utils/themeContext';
import { I18nProvider } from './i18n/i18nContext';
import AppNavigator from './navigation/AppNavigator';

function AppContent() {
  const { colors } = useTheme();

  return (
    <>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.statusBarBg} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </I18nProvider>
  );
}
