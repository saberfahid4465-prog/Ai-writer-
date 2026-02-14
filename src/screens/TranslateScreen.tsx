/**
 * AI Writer — Translate Screen
 *
 * Users upload a document and select source/target languages.
 * AI translates while preserving formatting.
 * Output in all formats (PDF, Word, PPT, Excel).
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

interface TranslateScreenProps {
  navigation: any;
}

export default function TranslateScreen({ navigation }: TranslateScreenProps) {
  const { colors } = useTheme();
  const detectedLang = detectDeviceLanguage();

  const [uploadedFile, setUploadedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<LanguageOption>(detectedLang);
  const [targetLanguage, setTargetLanguage] = useState<LanguageOption>(
    SUPPORTED_LANGUAGES.find((l) => l.code !== detectedLang.code) || SUPPORTED_LANGUAGES[1]
  );
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
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
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleSwapLanguages = () => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
  };

  const handleTranslate = () => {
    if (!uploadedFile || uploadedFile.canceled) {
      Alert.alert('File Required', 'Please upload a document to translate.');
      return;
    }

    if (sourceLanguage.code === targetLanguage.code) {
      Alert.alert('Same Language', 'Source and target languages must be different.');
      return;
    }

    navigation.navigate('TranslateProcessing', {
      uploadedFileUri: uploadedFile.assets[0].uri,
      uploadedFileName: uploadedFile.assets[0].name,
      sourceLanguage: sourceLanguage.name,
      sourceLanguageCode: sourceLanguage.code,
      targetLanguage: targetLanguage.name,
      targetLanguageCode: targetLanguage.code,
    });
  };

  const renderLanguagePicker = (
    languages: LanguageOption[],
    selected: LanguageOption,
    onSelect: (lang: LanguageOption) => void,
    onClose: () => void
  ) => (
    <View style={[styles.languageList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageItem,
              { borderBottomColor: colors.borderLight },
              lang.code === selected.code && { backgroundColor: colors.primaryLight },
            ]}
            onPress={() => {
              onSelect(lang);
              onClose();
            }}
          >
            <Text style={[styles.languageItemText, { color: colors.textPrimary }]}>
              {lang.name} ({lang.nativeName})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🌐</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Translate Document</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Upload a file and translate it to any language
          </Text>
        </View>

        {/* File Upload */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Upload Document</Text>
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
                : 'Tap to upload a file (PDF, Word, Excel, PPT, TXT)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Source Language */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Source Language</Text>
          <TouchableOpacity
            style={[styles.langButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { setShowSourcePicker(!showSourcePicker); setShowTargetPicker(false); }}
          >
            <Text style={[styles.langText, { color: colors.textPrimary }]}>
              {sourceLanguage.name} ({sourceLanguage.nativeName})
            </Text>
            <Text style={[styles.langArrow, { color: colors.textMuted }]}>▼</Text>
          </TouchableOpacity>
          {showSourcePicker && renderLanguagePicker(
            SUPPORTED_LANGUAGES, sourceLanguage, setSourceLanguage, () => setShowSourcePicker(false)
          )}
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapBtn} onPress={handleSwapLanguages}>
          <View style={[styles.swapInner, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.swapText, { color: colors.primary }]}>⇅ Swap Languages</Text>
          </View>
        </TouchableOpacity>

        {/* Target Language */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Target Language</Text>
          <TouchableOpacity
            style={[styles.langButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { setShowTargetPicker(!showTargetPicker); setShowSourcePicker(false); }}
          >
            <Text style={[styles.langText, { color: colors.textPrimary }]}>
              {targetLanguage.name} ({targetLanguage.nativeName})
            </Text>
            <Text style={[styles.langArrow, { color: colors.textMuted }]}>▼</Text>
          </TouchableOpacity>
          {showTargetPicker && renderLanguagePicker(
            SUPPORTED_LANGUAGES, targetLanguage, setTargetLanguage, () => setShowTargetPicker(false)
          )}
        </View>

        {/* Translate Button */}
        <TouchableOpacity
          style={[styles.translateButton, { backgroundColor: colors.headerBg, shadowColor: colors.shadowColor }]}
          onPress={handleTranslate}
        >
          <Text style={styles.translateButtonText}>🌐 Translate Document</Text>
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
  header: { alignItems: 'center', marginBottom: 24 },
  headerIcon: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, textAlign: 'center' },
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
  swapBtn: { alignItems: 'center', marginVertical: 8 },
  swapInner: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  swapText: { fontSize: 14, fontWeight: '600' },
  translateButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  translateButtonText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});
