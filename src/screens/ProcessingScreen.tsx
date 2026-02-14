/**
 * AI Writer — Processing Screen
 *
 * Shows progress while the AI generates content.
 * After AI generates, navigates to the Editor screen
 * where users can customize content before file generation.
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
import * as FileSystem from 'expo-file-system';
import { generateDocumentContent } from '../ai/longcatService';
import { AIWriterOutput } from '../ai/responseParser';
import { parseUploadedFile } from '../services/fileParserService';
import { useTheme } from '../utils/themeContext';
import { useTranslation } from '../i18n/i18nContext';
import { canMakeRequest, getRemainingTokens } from '../utils/tokenUsage';

// ─── Types ──────────────────────────────────────────────────────

interface ProcessingScreenProps {
  route: {
    params: {
      topic: string;
      language: string;
      languageCode: string;
      uploadedFileUri?: string | null;
      uploadedFileName?: string | null;
      outputFormats?: string[];
    };
  };
  navigation: any;
}

const STEPS_KEYS = [
  'processing_step_0',
  'processing_step_1',
  'processing_step_2',
  'processing_step_3',
] as const;

// ─── Component ──────────────────────────────────────────────────

export default function ProcessingScreen({ route, navigation }: ProcessingScreenProps) {
  const { topic, language, uploadedFileUri, outputFormats } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    runGeneration();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const runGeneration = async () => {
    try {
      // Step 0: Analyze input
      setCurrentStep(0);
      setProgress(10);

      let uploadedContent: string | undefined;
      if (uploadedFileUri) {
        try {
          const uploadedFileName = route.params.uploadedFileName || 'uploaded_file.txt';
          const parsed = await parseUploadedFile(uploadedFileUri, uploadedFileName);
          uploadedContent = parsed.content;
        } catch (parseError) {
          // Warn user that uploaded file couldn't be processed
          const fileMsg = parseError instanceof Error ? parseError.message : 'Could not read uploaded file.';
          Alert.alert(
            t('alert_file_warning_title'),
            `${fileMsg}\n\n${t('alert_file_warning_continue')}`,
            [
              { text: t('alert_go_back'), onPress: () => navigation.goBack(), style: 'cancel' },
              { text: t('alert_continue_without_file'), onPress: () => {} },
            ]
          );
          // Wait for user choice — if they continue, uploadedContent stays undefined
        }
      }

      if (cancelledRef.current) return;
      setProgress(20);

      // Step 1: Check token limit
      setCurrentStep(1);
      const hasTokens = await canMakeRequest();
      if (!hasTokens) {
        const remaining = await getRemainingTokens();
        Alert.alert(
          t('alert_daily_limit_title'),
          t('alert_daily_limit_msg', { n: String(remaining) }),
          [{ text: t('alert_go_back'), onPress: () => navigation.goBack() }]
        );
        return;
      }
      if (cancelledRef.current) return;
      setProgress(30);

      // Step 2: Call AI
      setCurrentStep(2);
      setProgress(35);
      const aiOutput: AIWriterOutput = await generateDocumentContent(
        topic,
        language,
        uploadedContent
      );

      if (cancelledRef.current) return;
      setProgress(90);

      // Step 3: Navigate to Editor
      setCurrentStep(3);
      setProgress(100);

      navigation.replace('Editor', {
        aiOutput,
        topic,
        language,
        outputFormats: outputFormats || ['pdf', 'docx', 'pptx', 'xlsx'],
      });
    } catch (error) {
      if (cancelledRef.current) return;

      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred.';
      Alert.alert(t('alert_generation_failed_title'), message, [
        { text: t('alert_try_again'), onPress: () => runGeneration() },
        { text: t('alert_go_back'), onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    navigation.goBack();
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />

      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('processing_title')}</Text>
      <Text style={[styles.topic, { color: colors.textMuted }]}>"{topic}"</Text>

      {/* Progress bar */}
      <View style={[styles.progressBarOuter, { backgroundColor: colors.border }]}>
        <View style={[styles.progressBarInner, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.progressText, { color: colors.primary }]}>{progress}%</Text>

      {/* Current step */}
      <Text style={[styles.stepText, { color: colors.textPrimary }]}>{t(STEPS_KEYS[currentStep] as any)}</Text>

      {/* Step indicators */}
      <View style={styles.stepsContainer}>
        {STEPS_KEYS.map((stepKey, index) => (
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
              {t(stepKey as any)}
            </Text>
          </View>
        ))}
      </View>

      {/* Cancel button */}
      <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.danger }]} onPress={handleCancel}>
        <Text style={[styles.cancelText, { color: colors.danger }]}>{t('processing_cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  topic: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  progressBarOuter: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 24,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  stepLabel: {
    fontSize: 13,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
