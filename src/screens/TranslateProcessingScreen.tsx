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
import { translateDocumentChunked } from '../ai/longcatService';
import { AIWriterOutput } from '../ai/responseParser';
import { parseUploadedFile, splitIntoChunks } from '../services/fileParserService';
import { useTheme } from '../utils/themeContext';
import { useTranslation } from '../i18n/i18nContext';
import { canMakeRequest, getRemainingTokens, estimateRequestCost, calculateTokenAnalysis } from '../utils/tokenUsage';

type OutputFormat = 'pdf' | 'docx' | 'pptx' | 'xlsx';

interface TranslateProcessingScreenProps {
  route: {
    params: {
      uploadedFileUri: string;
      uploadedFileName: string;
      sourceLanguage: string;
      sourceLanguageCode: string;
      targetLanguage: string;
      targetLanguageCode: string;
      outputFormats: OutputFormat[];
    };
  };
  navigation: any;
}

const STEPS_KEYS = [
  'trans_processing_step_0',
  'trans_processing_step_1',
  'trans_processing_step_2',
  'trans_processing_step_3',
] as const;

export default function TranslateProcessingScreen({ route, navigation }: TranslateProcessingScreenProps) {
  const {
    uploadedFileUri,
    uploadedFileName,
    sourceLanguage,
    targetLanguage,
    outputFormats,
  } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [chunkInfo, setChunkInfo] = useState('');
  const cancelledRef = useRef(false);

  // Checkpoint: store completed chunk outputs for retry resume
  const completedChunksRef = useRef<AIWriterOutput[]>([]);
  const nextChunkIndexRef = useRef(0);

  useEffect(() => {
    runTranslation();
    return () => { cancelledRef.current = true; };
  }, []);

  const runTranslation = async () => {
    try {
      // T35: Defense-in-depth — block same source/target language
      if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
        Alert.alert(
          t('alert_same_language_title'),
          t('alert_same_language_msg'),
          [{ text: t('alert_ok'), onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Step 0: Read file
      setCurrentStep(0);
      setProgress(10);

      const parsed = await parseUploadedFile(uploadedFileUri, uploadedFileName, { maxChars: 500000 });
      if (cancelledRef.current) return;
      setProgress(20);

      // S39: Validate content is not just whitespace
      if (!parsed.content || parsed.content.trim().length === 0) {
        Alert.alert(
          t('alert_empty_content_title'),
          t('alert_empty_content_msg'),
          [{ text: t('alert_ok'), onPress: () => navigation.goBack() }]
        );
        return;
      }

      // T36: Warn about very short content
      if (parsed.content.trim().length < 50) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('alert_short_content_title'),
            t('alert_short_content_msg'),
            [
              { text: t('alert_go_back'), onPress: () => resolve(false), style: 'cancel' },
              { text: t('alert_continue'), onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) {
          navigation.goBack();
          return;
        }
      }

      // If content was truncated at the safety limit (very large doc), warn user
      if (parsed.wasTruncated) {
        const kept = parsed.content.length;
        const total = parsed.originalLength || kept;
        const pct = Math.round((kept / total) * 100);
        const userWants = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('alert_truncated_title'),
            t('alert_truncated_msg', {
              kept: kept.toLocaleString(),
              total: total.toLocaleString(),
              pct: String(pct),
            }),
            [
              { text: t('alert_go_back'), onPress: () => resolve(false), style: 'cancel' },
              { text: t('alert_continue'), onPress: () => resolve(true) },
            ]
          );
        });
        if (!userWants) {
          cancelledRef.current = true;
          navigation.goBack();
          return;
        }
      }

      // Split into chunks for processing
      const chunks = splitIntoChunks(parsed.content);

      // Step 1: Token calculator — show user exactly what's needed
      setCurrentStep(1);
      const analysis = calculateTokenAnalysis(parsed.content.length, chunks.length);
      const remaining = await getRemainingTokens();
      const hasEnough = analysis.totalTokensNeeded <= remaining;
      const verdict = hasEnough
        ? t('alert_token_sufficient')
        : t('alert_token_insufficient');

      if (!hasEnough) {
        // T03-BUG fix: block operation entirely if tokens are insufficient
        // to prevent wasting tokens on partial chunk processing
        Alert.alert(
          t('alert_token_warning_title'),
          t('alert_token_warning_msg', {
            chars: analysis.totalChars.toLocaleString(),
            chunks: String(analysis.chunks),
            cost: analysis.totalTokensNeeded.toLocaleString(),
            remaining: remaining.toLocaleString(),
            verdict,
          }),
          [{ text: t('alert_go_back'), onPress: () => navigation.goBack() }]
        );
        return;
      }

      const userApproves = await new Promise<boolean>((resolve) => {
        Alert.alert(
          t('alert_token_warning_title'),
          t('alert_token_warning_msg', {
            chars: analysis.totalChars.toLocaleString(),
            chunks: String(analysis.chunks),
            cost: analysis.totalTokensNeeded.toLocaleString(),
            remaining: remaining.toLocaleString(),
            verdict,
          }),
          [
            { text: t('alert_go_back'), onPress: () => resolve(false), style: 'cancel' },
            { text: t('alert_continue'), onPress: () => resolve(true) },
          ]
        );
      });
      if (!userApproves) {
        navigation.goBack();
        return;
      }

      // Verify effective token availability
      const hasTokens = await canMakeRequest();
      if (!hasTokens) {
        Alert.alert(
          t('alert_daily_limit_title'),
          t('alert_daily_limit_msg', { n: String(remaining) }),
          [{ text: t('alert_go_back'), onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Step 2: Translate with AI (chunked)
      setCurrentStep(2);
      setProgress(30);

      const aiOutput: AIWriterOutput = await translateDocumentChunked(
        parsed.content,
        sourceLanguage,
        targetLanguage,
        uploadedFileName,
        (current, total) => {
          if (total > 1) {
            setChunkInfo(t('processing_chunk_progress', { current: String(current), total: String(total) }));
          }
          setProgress(30 + Math.round((current / total) * 60));
        },
        () => cancelledRef.current,
        (chunkIndex, output) => {
          // Checkpoint: save completed chunk for retry resume
          completedChunksRef.current = [...completedChunksRef.current.slice(0, chunkIndex), output];
          nextChunkIndexRef.current = chunkIndex + 1;
        },
        nextChunkIndexRef.current,
        completedChunksRef.current
      );

      if (cancelledRef.current) return;
      setProgress(95);

      // Step 3: Navigate to editor
      setCurrentStep(3);
      setProgress(100);
      setChunkInfo('');

      navigation.replace('Editor', {
        aiOutput,
        topic: `${uploadedFileName} → ${targetLanguage}`,
        language: targetLanguage,
        outputFormats,
      });
    } catch (error) {
      if (cancelledRef.current) return;
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      Alert.alert(t('alert_translation_failed_title'), message, [
        { text: t('alert_try_again'), onPress: () => runTranslation() },
        { text: t('alert_go_back'), onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    // T031 fix: if we have completed chunks, offer to keep partial results
    if (completedChunksRef.current.length > 0) {
      Alert.alert(
        t('alert_cancel_partial_title') || 'Cancel Translation?',
        t('alert_cancel_partial_msg', {
          completed: String(completedChunksRef.current.length),
        }) || `${completedChunksRef.current.length} chunk(s) already processed. Keep partial results?`,
        [
          {
            text: t('alert_discard') || 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
          {
            text: t('alert_keep_partial') || 'Keep Partial',
            onPress: () => {
              try {
                // Merge completed chunks and navigate to editor with partial output
                const partialOutput = completedChunksRef.current.reduce((acc, curr) => ({
                  pdf_word: {
                    title: acc.pdf_word.title,
                    author: acc.pdf_word.author,
                    language: acc.pdf_word.language,
                    sections: [...acc.pdf_word.sections, ...curr.pdf_word.sections],
                  },
                  ppt: { slides: [...acc.ppt.slides, ...curr.ppt.slides] },
                  excel: { headers: acc.excel.headers, rows: [...acc.excel.rows, ...curr.excel.rows] },
                }));
                navigation.replace('Editor', {
                  aiOutput: partialOutput,
                  topic: `${uploadedFileName} → ${targetLanguage} (partial)`,
                  language: targetLanguage,
                  outputFormats,
                });
              } catch {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('trans_processing_title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {t('trans_processing_direction', { source: sourceLanguage, target: targetLanguage })}
      </Text>
      <Text style={[styles.fileName, { color: colors.textSecondary }]}>📄 {uploadedFileName}</Text>

      <View style={[styles.progressBarOuter, { backgroundColor: colors.border }]}>
        <View style={[styles.progressBarInner, { width: `${progress}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.progressText, { color: colors.primary }]}>{progress}%</Text>

      <Text style={[styles.stepText, { color: colors.textPrimary }]}>{t(STEPS_KEYS[currentStep] as any)}</Text>
      {chunkInfo ? <Text style={[styles.chunkInfoText, { color: colors.textMuted }]}>{chunkInfo}</Text> : null}

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

      <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.danger }]} onPress={handleCancel}>
        <Text style={[styles.cancelText, { color: colors.danger }]}>{t('trans_processing_cancel')}</Text>
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
  stepText: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  chunkInfoText: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  stepsContainer: { width: '100%', marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  stepLabel: { fontSize: 13 },
  cancelButton: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
