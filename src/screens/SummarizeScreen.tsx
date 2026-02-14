/**
 * AI Writer — Summarize Screen
 *
 * Users upload a document and AI extracts key points,
 * creating a professional summary in all output formats.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SUPPORTED_LANGUAGES, detectDeviceLanguage, LanguageOption } from '../utils/languageConfig';
import { useTheme } from '../utils/themeContext';
import { useTranslation } from '../i18n/i18nContext';

interface SummarizeScreenProps {
  navigation: any;
}

export default function SummarizeScreen({ navigation }: SummarizeScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const detectedLang = detectDeviceLanguage();

  const [uploadedFile, setUploadedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<LanguageOption>(detectedLang);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedFile(result);
      }
    } catch (error) {
      Alert.alert(t('alert_error'), t('alert_file_pick_failed'));
    }
  };

  const handleSummarize = () => {
    if (!uploadedFile || uploadedFile.canceled) {
      Alert.alert(t('alert_file_required_title'), t('alert_file_required_summarize_msg'));
      return;
    }

    navigation.navigate('SummarizeProcessing', {
      uploadedFileUri: uploadedFile.assets[0].uri,
      uploadedFileName: uploadedFile.assets[0].name,
      language: outputLanguage.name,
      languageCode: outputLanguage.code,
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">


        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>📋</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('summarize_title')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {t('summarize_subtitle')}
          </Text>
        </View>

        {/* How it works */}
        <View style={[styles.infoCard, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>{t('summarize_how_title')}</Text>
          <Text style={[styles.infoItem, { color: colors.textSecondary }]}>{t('summarize_how_1')}</Text>
          <Text style={[styles.infoItem, { color: colors.textSecondary }]}>{t('summarize_how_2')}</Text>
          <Text style={[styles.infoItem, { color: colors.textSecondary }]}>{t('summarize_how_3')}</Text>
          <Text style={[styles.infoItem, { color: colors.textSecondary }]}>{t('summarize_how_4')}</Text>
        </View>

        {/* File Upload */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('summarize_upload_label')}</Text>
          <TouchableOpacity
            style={[styles.uploadButton, {
              backgroundColor: colors.surface,
              borderColor: uploadedFile && !uploadedFile.canceled ? colors.success : colors.border,
            }]}
            onPress={handleFileUpload}
          >
            <Text style={styles.uploadIcon}>
              {uploadedFile && !uploadedFile.canceled ? '✅' : '📎'}
            </Text>
            <Text style={[styles.uploadText, { color: colors.textMuted }]} numberOfLines={2}>
              {uploadedFile && !uploadedFile.canceled
                ? `📄 ${uploadedFile.assets[0].name}`
                : t('summarize_upload_placeholder')}
            </Text>
          </TouchableOpacity>

          {/* File compatibility note */}
          <View style={[styles.noteCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.noteText, { color: colors.textMuted }]}>
              ✅ <Text style={{ fontWeight: '600' }}>{t('compat_txt')}</Text> {t('compat_txt_desc')}{"\n"}
              ✅ <Text style={{ fontWeight: '600' }}>{t('compat_word')}</Text> {t('compat_word_desc')}{"\n"}
              ✅ <Text style={{ fontWeight: '600' }}>{t('compat_ppt')}</Text> {t('compat_ppt_desc')}{"\n"}
              ✅ <Text style={{ fontWeight: '600' }}>{t('compat_excel')}</Text> {t('compat_excel_desc')}{"\n"}
              🚫 <Text style={{ fontWeight: '600' }}>{t('compat_pdf')}</Text> {t('compat_pdf_desc')}
            </Text>
          </View>
        </View>

        {/* Output Language */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('summarize_language_label')}</Text>
          <TouchableOpacity
            style={[styles.langButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
          >
            <Text style={[styles.langText, { color: colors.textPrimary }]}>
              🌐 {outputLanguage.name} ({outputLanguage.nativeName})
            </Text>
            <Text style={[styles.langArrow, { color: colors.textMuted }]}>▼</Text>
          </TouchableOpacity>

          {showLanguagePicker && (
            <View style={[styles.languageList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageItem,
                      { borderBottomColor: colors.borderLight },
                      lang.code === outputLanguage.code && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => {
                      setOutputLanguage(lang);
                      setShowLanguagePicker(false);
                    }}
                  >
                    <Text style={[styles.languageItemText, { color: colors.textPrimary }]}>
                      {lang.name} ({lang.nativeName})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Summarize Button */}
        <TouchableOpacity
          style={[styles.summarizeButton, { backgroundColor: colors.headerBg, shadowColor: colors.shadowColor }]}
          onPress={handleSummarize}
        >
          <Text style={styles.summarizeButtonText}>{t('summarize_btn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 20 },
  headerIcon: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, textAlign: 'center' },
  infoCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  infoItem: { fontSize: 13, marginBottom: 6 },
  section: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
  },
  uploadIcon: { fontSize: 20, marginRight: 10 },
  uploadText: { fontSize: 14, flex: 1 },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  langText: { fontSize: 15 },
  langArrow: { fontSize: 12 },
  languageList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  languageItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  languageItemText: { fontSize: 14 },
  summarizeButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summarizeButtonText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  noteCard: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  noteText: { fontSize: 12, lineHeight: 18 },
});
