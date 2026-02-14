/**
 * AI Writer — Translate Processing Screen
 *
 * Shows progress while translating a document.
 * Steps:
 * 1. Reading uploaded file
 * 2. Translating with AI
 * 3. Fetching images
 * 4. Building all file formats
 * 5. Finalizing
 *
 * After AI translation, navigates to Editor for customization.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { translateDocument } from '../ai/longcatService';
import { AIWriterOutput } from '../ai/responseParser';
import { parseUploadedFile } from '../services/fileParserService';
import { useTheme } from '../utils/themeContext';
import { canMakeRequest, getRemainingTokens } from '../utils/tokenUsage';

interface TranslateProcessingScreenProps {
  route: {
    params: {
      uploadedFileUri: string;
      uploadedFileName: string;
      sourceLanguage: string;
      sourceLanguageCode: string;
      targetLanguage: string;
      targetLanguageCode: string;
    };
  };
  navigation: any;
}

const STEPS = [
  'Reading uploaded file...',
  'Checking daily usage...',
  'Translating with AI...',
  'Preparing editor...',
];

export default function TranslateProcessingScreen({ route, navigation }: TranslateProcessingScreenProps) {
  const {
    uploadedFileUri,
    uploadedFileName,
    sourceLanguage,
    targetLanguage,
  } = route.params;
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    runTranslation();
    return () => { cancelledRef.current = true; };
  }, []);

  const runTranslation = async () => {
    try {
      // Step 0: Read file
      setCurrentStep(0);
      setProgress(10);

      const parsed = await parseUploadedFile(uploadedFileUri, uploadedFileName);
      if (cancelledRef.current) return;
      setProgress(25);

      // Step 1: Check token limit
      setCurrentStep(1);
      const hasTokens = await canMakeRequest();
      if (!hasTokens) {
        const remaining = await getRemainingTokens();
        Alert.alert(
          'Daily Limit Reached',
          `You've used your daily 5,000 token limit. You have ${remaining} tokens remaining. Limit resets at midnight.`,
          [{ text: 'Go Back', onPress: () => navigation.goBack() }]
        );
        return;
      }
      if (cancelledRef.current) return;
      setProgress(35);

      // Step 2: Translate with AI
      setCurrentStep(2);
      setProgress(40);

      const aiOutput: AIWriterOutput = await translateDocument(
        parsed.content,
        sourceLanguage,
        targetLanguage,
        uploadedFileName
      );

      if (cancelledRef.current) return;
      setProgress(85);

      // Step 3: Navigate to editor
      setCurrentStep(3);
      setProgress(100);

      navigation.replace('Editor', {
        aiOutput,
        topic: `${uploadedFileName} → ${targetLanguage}`,
        language: targetLanguage,
      });
    } catch (error) {
      if (cancelledRef.current) return;
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      Alert.alert('Translation Failed', message, [
        { text: 'Try Again', onPress: () => runTranslation() },
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>Translating Document...</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {sourceLanguage} → {targetLanguage}
      </Text>
      <Text style={[styles.fileName, { color: colors.textSecondary }]}>📄 {uploadedFileName}</Text>

      <View style={[styles.progressBarOuter, { backgroundColor: colors.border }]}>
        <View style={[styles.progressBarInner, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.progressText, { color: colors.primary }]}>{progress}%</Text>

      <Text style={[styles.stepText, { color: colors.textPrimary }]}>{STEPS[currentStep]}</Text>

      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <View
              style={[
                styles.stepDot,
                { backgroundColor: colors.border },
                index < currentStep && { backgroundColor: colors.success },
                index === currentStep && { backgroundColor: colors.primary },
              ]}
            />
            <Text
              style={[
                styles.stepLabel,
                { color: colors.textMuted },
                index < currentStep && { color: colors.success },
                index === currentStep && { color: colors.textPrimary, fontWeight: '600' },
              ]}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.danger }]} onPress={handleCancel}>
        <Text style={[styles.cancelText, { color: colors.danger }]}>✖ Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  spinner: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 4 },
  fileName: { fontSize: 13, marginBottom: 20 },
  progressBarOuter: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarInner: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
  stepText: { fontSize: 15, fontWeight: '500', marginBottom: 24 },
  stepsContainer: { width: '100%', marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  stepLabel: { fontSize: 13 },
  cancelButton: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
