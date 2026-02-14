/**
 * AI Writer — Home Screen (Redesigned)
 *
 * Unified page: enter topic or upload file, pick output format,
 * choose language, toggle options (summarize, translate, tables),
 * then generate.  Logo from assets/logo.png.  Premium banner removed.
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
  const [optSummarize, setOptSummarize] = useState(false);
  const [optTranslate, setOptTranslate] = useState(false);
  const [optTables, setOptTables] = useState(false);
  const [translateLang, setTranslateLang] = useState<LanguageOption | null>(null);
  const [showTranslatePicker, setShowTranslatePicker] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: DAILY_TOKEN_LIMIT, remaining: DAILY_TOKEN_LIMIT, percentage: 0 });
  const { colors } = useTheme();

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
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const clearFile = () => setUploadedFile(null);

  // ─── Generate ─────────────────────────────────────────────
  const handleGenerate = () => {
    const trimmed = topic.trim();
    if (trimmed.length < 3 && !uploadedFile) {
      Alert.alert('Input Required', 'Enter a topic (3+ chars) or upload a file.');
      return;
    }
    if (selectedFormats.size === 0) {
      Alert.alert('Format Required', 'Pick at least one output format.');
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
      optSummarize,
      optTranslate,
      translateLanguage: translateLang?.name ?? null,
      translateLanguageCode: translateLang?.code ?? null,
      optTables,
    });
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.iconBtnText}>📁</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Header with Logo */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI Writer</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Generate professional documents instantly
          </Text>
        </View>

        {/* ── Topic Input ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            📝  Topic or Prompt
          </Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.inputText,
            }]}
            placeholder='e.g. "Business Plan for Coffee Shop"'
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
                Upload PDF, Word, Excel, PPT, or TXT
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Output Format Selector ───────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            📦  Output Format
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
            <Text style={[styles.label, { color: colors.textPrimary }]}>🌐  Language</Text>
            <Text style={[styles.badgeSmall, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
              Auto-detect
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

        {/* ── Additional Options ───────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>⚡  Options</Text>

          {/* Summarize */}
          <TouchableOpacity
            style={[styles.optionRow, {
              backgroundColor: optSummarize ? colors.primaryLight : colors.surface,
              borderColor: optSummarize ? colors.primary : colors.border,
            }]}
            onPress={() => setOptSummarize(!optSummarize)}
          >
            <Text style={styles.optIcon}>📋</Text>
            <View style={styles.optInfo}>
              <Text style={[styles.optTitle, { color: colors.textPrimary }]}>Summarize</Text>
              <Text style={[styles.optDesc, { color: colors.textMuted }]}>
                Extract key points from uploaded files
              </Text>
            </View>
            <View style={[styles.optCheck, { backgroundColor: optSummarize ? colors.primary : colors.border }]}>
              {optSummarize && <Text style={styles.optCheckMark}>✓</Text>}
            </View>
          </TouchableOpacity>

          {/* Translate */}
          <TouchableOpacity
            style={[styles.optionRow, {
              backgroundColor: optTranslate ? colors.primaryLight : colors.surface,
              borderColor: optTranslate ? colors.primary : colors.border,
            }]}
            onPress={() => { setOptTranslate(!optTranslate); if (optTranslate) setShowTranslatePicker(false); }}
          >
            <Text style={styles.optIcon}>🌍</Text>
            <View style={styles.optInfo}>
              <Text style={[styles.optTitle, { color: colors.textPrimary }]}>Translate</Text>
              <Text style={[styles.optDesc, { color: colors.textMuted }]}>
                Translate output to another language
              </Text>
            </View>
            <View style={[styles.optCheck, { backgroundColor: optTranslate ? colors.primary : colors.border }]}>
              {optTranslate && <Text style={styles.optCheckMark}>✓</Text>}
            </View>
          </TouchableOpacity>

          {optTranslate && (
            <>
              <TouchableOpacity
                style={[styles.languageBtn, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 6 }]}
                onPress={() => setShowTranslatePicker(!showTranslatePicker)}
              >
                <Text style={[styles.languageBtnText, { color: translateLang ? colors.textPrimary : colors.placeholder }]}>
                  {translateLang ? `${translateLang.name} (${translateLang.nativeName})` : 'Select target language…'}
                </Text>
                <Text style={[styles.arrow, { color: colors.textMuted }]}>
                  {showTranslatePicker ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              {showTranslatePicker && (
                <View style={[styles.langList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                    {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
                      <TouchableOpacity
                        key={lang.code}
                        style={[styles.langItem, { borderBottomColor: colors.borderLight },
                          translateLang?.code === lang.code && { backgroundColor: colors.primaryLight },
                        ]}
                        onPress={() => { setTranslateLang(lang); setShowTranslatePicker(false); }}
                      >
                        <Text style={[styles.langItemText, { color: colors.textPrimary }]}>
                          {lang.name} ({lang.nativeName})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {/* Include Tables & Charts */}
          <TouchableOpacity
            style={[styles.optionRow, {
              backgroundColor: optTables ? colors.primaryLight : colors.surface,
              borderColor: optTables ? colors.primary : colors.border,
            }]}
            onPress={() => setOptTables(!optTables)}
          >
            <Text style={styles.optIcon}>📊</Text>
            <View style={styles.optInfo}>
              <Text style={[styles.optTitle, { color: colors.textPrimary }]}>Tables & Charts</Text>
              <Text style={[styles.optDesc, { color: colors.textMuted }]}>
                Include tables in Excel/PPT output
              </Text>
            </View>
            <View style={[styles.optCheck, { backgroundColor: optTables ? colors.primary : colors.border }]}>
              {optTables && <Text style={styles.optCheckMark}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Generate Button ──────────────────────────────── */}
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.headerBg, shadowColor: colors.shadowColor }]}
          onPress={handleGenerate}
          activeOpacity={0.85}
        >
          <Text style={styles.generateText}>✨  Generate File</Text>
        </TouchableOpacity>

        {/* ── Daily Token Usage ─────────────────────────────── */}
        <View style={[styles.tokenBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tokenRow}>
            <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>⚡ Daily Usage</Text>
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
            {tokenUsage.remaining.toLocaleString()} tokens remaining today
          </Text>
        </View>

        {/* ── Bottom Links ─────────────────────────────────── */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
            <Text style={[styles.linkText, { color: colors.textMuted }]}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={[styles.linkText, { color: colors.textMuted }]}>Terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 50, paddingBottom: 40 },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 6 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 20 },

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

  // Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  optIcon: { fontSize: 24, marginRight: 12 },
  optInfo: { flex: 1 },
  optTitle: { fontSize: 15, fontWeight: '600' },
  optDesc: { fontSize: 12, marginTop: 2 },
  optCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  optCheckMark: { color: '#FFF', fontSize: 14, fontWeight: '700' },

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
