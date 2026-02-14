/**
 * AI Writer — App Entry Point
 *
 * Root component that renders the navigation stack
 * wrapped in the ThemeProvider for dark/light mode support.
 */

import React from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from './utils/themeContext';
import { I18nProvider } from './i18n/i18nContext';
import AppNavigator from './navigation/AppNavigator';
import { useStoragePermission } from './hooks/useStoragePermission';

function AppContent() {
  const { colors } = useTheme();
  const { loading } = useStoragePermission();

  // Show loading indicator while checking/requesting permissions
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.statusBarBg} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.statusBarBg} />
      <AppNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </I18nProvider>
  );
}
