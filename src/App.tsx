/**
 * AI Writer — App Entry Point
 *
 * Root component that renders the navigation stack
 * wrapped in the ThemeProvider for dark/light mode support.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from './utils/themeContext';
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
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
