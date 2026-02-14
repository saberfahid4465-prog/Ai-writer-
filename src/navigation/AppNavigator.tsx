/**
 * AI Writer — App Navigator
 *
 * React Navigation stack navigator connecting all screens.
 * Includes: Home, Generate, Translate, Summarize, Editor, Result flows.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../utils/themeContext';
import { AIWriterOutput } from '../ai/responseParser';

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

export type RootStackParamList = {
  Home: undefined;
  Processing: {
    topic: string;
    language: string;
    languageCode: string;
    uploadedFileUri?: string | null;
    uploadedFileName?: string | null;
  };
  Translate: undefined;
  Summarize: undefined;
  TranslateProcessing: {
    uploadedFileUri: string;
    uploadedFileName: string;
    sourceLanguage: string;
    sourceLanguageCode: string;
    targetLanguage: string;
    targetLanguageCode: string;
  };
  SummarizeProcessing: {
    uploadedFileUri: string;
    uploadedFileName: string;
    language: string;
    languageCode: string;
  };
  Editor: {
    aiOutput: AIWriterOutput;
    topic: string;
    language: string;
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
  History: undefined;
  Settings: undefined;
  Premium: undefined;
  Privacy: undefined;
  Terms: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Navigator ──────────────────────────────────────────────────

export default function AppNavigator() {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Processing"
          component={ProcessingScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Translate" component={TranslateScreen} />
        <Stack.Screen name="Summarize" component={SummarizeScreen} />
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
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Premium" component={PremiumScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
