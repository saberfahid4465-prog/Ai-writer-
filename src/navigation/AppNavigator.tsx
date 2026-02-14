/**
 * AI Writer — App Navigator
 *
 * Bottom Tab Bar with 5 tabs:
 *   ✏️ Generate  |  📋 Summarize  |  🌍 Translate  |  📁 History  |  ⚙️ Settings
 *
 * Each tab has its own screen. Processing, Editor, Result, etc.
 * are pushed as stack screens on top of the tab bar.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../utils/themeContext';
import { useTranslation } from '../i18n/i18nContext';
import { AIWriterOutput } from '../ai/responseParser';

// ─── Screens ────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ResultScreen from '../screens/ResultScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import TranslateScreen from '../screens/TranslateScreen';
import SummarizeScreen from '../screens/SummarizeScreen';
import TranslateProcessingScreen from '../screens/TranslateProcessingScreen';
import SummarizeProcessingScreen from '../screens/SummarizeProcessingScreen';
import EditorScreen from '../screens/EditorScreen';

// ─── Types ──────────────────────────────────────────────────────

export type OutputFormat = 'pdf' | 'docx' | 'pptx' | 'xlsx';

export type RootStackParamList = {
  // Tab root
  HomeTabs: undefined;
  // Stack screens pushed on top of tabs
  Processing: {
    topic: string;
    language: string;
    languageCode: string;
    uploadedFileUri?: string | null;
    uploadedFileName?: string | null;
    outputFormats: OutputFormat[];
  };
  TranslateProcessing: {
    uploadedFileUri: string;
    uploadedFileName: string;
    sourceLanguage: string;
    sourceLanguageCode: string;
    targetLanguage: string;
    targetLanguageCode: string;
    outputFormats: OutputFormat[];
  };
  SummarizeProcessing: {
    uploadedFileUri: string;
    uploadedFileName: string;
    language: string;
    languageCode: string;
    outputFormats: OutputFormat[];
  };
  Editor: {
    aiOutput: AIWriterOutput;
    topic: string;
    language: string;
    outputFormats: OutputFormat[];
  };
  Result: {
    topic: string;
    language: string;
    files: Array<{
      name: string;
      path: string;
      type: 'pdf' | 'docx' | 'pptx' | 'xlsx';
    }>;
  };
  Premium: undefined;
  Privacy: undefined;
  Terms: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── Tab Icon ───────────────────────────────────────────────────

function TabIcon({ emoji, label, focused, color }: { emoji: string; label: string; focused: boolean; color: string }) {
  return (
    <View style={iconStyles.wrap}>
      <Text style={[iconStyles.emoji, focused && iconStyles.emojiFocused]}>{emoji}</Text>
      <Text style={[iconStyles.label, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  emoji: { fontSize: 22 },
  emojiFocused: { fontSize: 26 },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});

// ─── Bottom Tabs ────────────────────────────────────────────────

function BottomTabs() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 4,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="✏️" label={t('tab_generate')} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Summarize"
        component={SummarizeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📋" label={t('tab_summarize')} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Translate"
        component={TranslateScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🌍" label={t('tab_translate')} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📁" label={t('tab_history')} focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="⚙️" label={t('tab_settings')} focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ───────────────────────────────────────

export default function AppNavigator() {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Bottom tabs as the root */}
        <Stack.Screen name="HomeTabs" component={BottomTabs} />

        {/* Full-screen stack screens (tab bar hidden) */}
        <Stack.Screen
          name="Processing"
          component={ProcessingScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="TranslateProcessing"
          component={TranslateProcessingScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="SummarizeProcessing"
          component={SummarizeProcessingScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Editor" component={EditorScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="Premium" component={PremiumScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
