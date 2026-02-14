/**
 * AI Writer — Home Screen (Generate Tab)
 *
 * Enter topic or upload file, pick output format,
 * choose language, then generate.
 * Summarize & Translate are now separate tabs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LanguageOption } from '../utils/languageConfig';
import { useTheme } from '../utils/themeContext';
import { useTranslation } from '../i18n/i18nContext';
import { getUsageDisplay, DAILY_TOKEN_LIMIT } from '../utils/tokenUsage';

// ─── Types ──────────────────────────────────────────────────────

export type OutputFormat = 'pdf' | 'docx' | 'pptx' | 'xlsx';

interface FormatOption {
  key: OutputFormat;
  icon: string;
  label: string;
  color: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { key: 'pdf',  icon: '📕', label: 'PDF',        color: '#E53E3E' },
  { key: 'docx', icon: '📘', label: 'Word',       color: '#2B6CB0' },
  { key: 'pptx', icon: '📙', label: 'PowerPoint', color: '#DD6B20' },
  { key: 'xlsx', icon: '📗', label: 'Excel',      color: '#38A169' },
];

interface HomeScreenProps {
  navigation: any;
}

// ─── Component ──────────────────────────────────────────────────

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [topic, setTopic] = useState('');
  const [uploadedFile, setUploadedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<Set<OutputFormat>>(new Set(['pdf']));
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(DEFAULT_LANGUAGE);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: DAILY_TOKEN_LIMIT, remaining: DAILY_TOKEN_LIMIT, percentage: 0 });
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();

  const refreshTokenUsage = useCallback(async () => {
    const usage = await getUsageDisplay();
    setTokenUsage(usage);
  }, []);

  useEffect(() => {
    refreshTokenUsage();
    const unsub = navigation.addListener('focus', refreshTokenUsage);
    return unsub;
  }, [navigation, refreshTokenUsage]);

  // ─── Format toggle ────────────────────────────────────────
  const toggleFormat = (fmt: OutputFormat) => {
    setSelectedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(fmt)) {
        if (next.size > 1) next.delete(fmt);
      } else {
        next.add(fmt);
      }
      return next;
    });
  };

  // ─── File Upload ──────────────────────────────────────────
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
    } catch {
      Alert.alert(t('alert_error'), t('alert_file_pick_failed'));
    }
  };

  const clearFile = () => setUploadedFile(null);

  // ─── Generate ─────────────────────────────────────────────
  const handleGenerate = () => {
    const trimmed = topic.trim();
    if (trimmed.length < 3 && !uploadedFile) {
      Alert.alert(t('alert_input_required_title'), t('alert_input_required_msg'));
      return;
    }
    if (selectedFormats.size === 0) {
      Alert.alert(t('alert_format_required_title'), t('alert_format_required_msg'));
      return;
    }

    navigation.navigate('Processing', {
      topic: trimmed || 'Uploaded Document',
      language: selectedLanguage.name,
      languageCode: selectedLanguage.code,
      uploadedFileUri:
        uploadedFile && !uploadedFile.canceled ? uploadedFile.assets[0].uri : null,
      uploadedFileName:
        uploadedFile && !uploadedFile.canceled ? uploadedFile.assets[0].name : null,
      outputFormats: Array.from(selectedFormats),
    });
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header with Logo */}
        <View style={styles.header}>
          <Image source={isDark ? require('../../assets/logo.png') : require('../../assets/logo-light.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('home_title')}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {t('home_subtitle')}
          </Text>
        </View>

        {/* ── Topic Input ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('home_topic_label')}
          </Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.inputText,
            }]}
            placeholder={t('home_topic_placeholder')}
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={topic}
            onChangeText={setTopic}
          />
        </View>

        {/* ── File Upload ──────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={uploadedFile && !uploadedFile.canceled ? clearFile : handleFileUpload}
        >
          {uploadedFile && !uploadedFile.canceled ? (
            <View style={styles.uploadedRow}>
              <Text style={styles.uploadIcon}>📄</Text>
              <Text style={[styles.uploadText, { color: colors.textPrimary }]} numberOfLines={1}>
                {uploadedFile.assets[0].name}
              </Text>
              <Text style={[styles.removeFileText, { color: colors.danger }]}>✕</Text>
            </View>
          ) : (
            <View style={styles.uploadedRow}>
              <Text style={styles.uploadIcon}>📎</Text>
              <Text style={[styles.uploadText, { color: colors.textMuted }]}>
                {t('home_upload_placeholder')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Output Format Selector ───────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('home_format_label')}
          </Text>
          <View style={styles.formatGrid}>
            {FORMAT_OPTIONS.map((fmt) => {
              const active = selectedFormats.has(fmt.key);
              return (
                <TouchableOpacity
                  key={fmt.key}
                  style={[
                    styles.formatCard,
                    {
                      backgroundColor: active ? colors.primaryLight : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleFormat(fmt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.formatIcon}>{fmt.icon}</Text>
                  <Text style={[styles.formatLabel, { color: active ? colors.primary : colors.textPrimary }]}>
                    {fmt.label}
                  </Text>
                  {active && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Language Selector ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('home_language_label')}</Text>
            <Text style={[styles.badgeSmall, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
              {t('home_language_badge')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.languageBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
          >
            <Text style={[styles.languageBtnText, { color: colors.textPrimary }]}>
              {selectedLanguage.name} ({selectedLanguage.nativeName})
            </Text>
            <Text style={[styles.arrow, { color: colors.textMuted }]}>
              {showLanguagePicker ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showLanguagePicker && (
            <View style={[styles.langList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langItem,
                      { borderBottomColor: colors.borderLight },
                      lang.code === selectedLanguage.code && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => { setSelectedLanguage(lang); setShowLanguagePicker(false); }}
                  >
                    <Text style={[styles.langItemText, { color: colors.textPrimary }]}>
                      {lang.name} ({lang.nativeName})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Generate Button ──────────────────────────────── */}
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.headerBg, shadowColor: colors.shadowColor }]}
          onPress={handleGenerate}
          activeOpacity={0.85}
        >
          <Text style={styles.generateText}>{t('home_generate_btn')}</Text>
        </TouchableOpacity>

        {/* ── Daily Token Usage ─────────────────────────────── */}
        <View style={[styles.tokenBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tokenRow}>
            <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>{t('home_daily_usage_label')}</Text>
            <Text style={[styles.tokenCount, { color: colors.textMuted }]}>
              {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.tokenTrack, { backgroundColor: colors.borderLight }]}>
            <View style={[styles.tokenFill, {
              width: `${tokenUsage.percentage}%`,
              backgroundColor: tokenUsage.percentage > 80 ? colors.danger : colors.primary,
            }]} />
          </View>
          <Text style={[styles.tokenRem, { color: colors.textMuted }]}>
            {t('home_tokens_remaining', { n: tokenUsage.remaining.toLocaleString() })}
          </Text>
        </View>

        {/* ── Bottom Links ─────────────────────────────────── */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
            <Text style={[styles.linkText, { color: colors.textMuted }]}>{t('link_privacy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={[styles.linkText, { color: colors.textMuted }]}>{t('link_terms')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 50, paddingBottom: 100 },

  // Header
  header: { alignItems: 'center', marginBottom: 22 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  headerSub: { fontSize: 14 },

  // Section
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badgeSmall: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },

  // Topic
  textInput: { borderRadius: 12, borderWidth: 1, padding: 16, fontSize: 16, minHeight: 100 },

  // Upload
  uploadBtn: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', padding: 16, marginBottom: 20 },
  uploadedRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  uploadIcon: { fontSize: 20, marginRight: 10 },
  uploadText: { fontSize: 14, flex: 1 },
  removeFileText: { fontSize: 18, fontWeight: '700', marginLeft: 8 },

  // Format
  formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  formatCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  formatIcon: { fontSize: 30, marginBottom: 6 },
  formatLabel: { fontSize: 14, fontWeight: '600' },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Language
  languageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, padding: 16 },
  languageBtnText: { fontSize: 15 },
  arrow: { fontSize: 12 },
  langList: { borderRadius: 12, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  langItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  langItemText: { fontSize: 14 },

  // Generate
  generateBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateText: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  // Tokens
  tokenBar: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  tokenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tokenLabel: { fontSize: 13, fontWeight: '600' },
  tokenCount: { fontSize: 12 },
  tokenTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  tokenFill: { height: '100%', borderRadius: 3 },
  tokenRem: { fontSize: 11, textAlign: 'center' },

  // Bottom
  bottomLinks: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 10 },
  linkText: { fontSize: 14, fontWeight: '500' },
});
