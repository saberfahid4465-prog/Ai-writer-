/**
 * AI Writer — Home Screen
 *
 * Main entry screen with three feature modes:
 * - Generate: Create new documents from a topic
 * - Translate: Translate uploaded documents
 * - Summarize: Summarize uploaded documents
 *
 * Shows daily token usage, auto-detected language,
 * and access to Settings, Premium, History.
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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LanguageOption } from '../utils/languageConfig';
import { useTheme } from '../utils/themeContext';
import { getUsageDisplay, DAILY_TOKEN_LIMIT } from '../utils/tokenUsage';

// ─── Types ──────────────────────────────────────────────────────

interface HomeScreenProps {
  navigation: any;
}

// ─── Component ──────────────────────────────────────────────────

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [topic, setTopic] = useState('');
  const [uploadedFile, setUploadedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(DEFAULT_LANGUAGE);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: DAILY_TOKEN_LIMIT, remaining: DAILY_TOKEN_LIMIT, percentage: 0 });
  const { colors, isDark } = useTheme();

  // Load token usage on mount and focus
  const refreshTokenUsage = useCallback(async () => {
    const usage = await getUsageDisplay();
    setTokenUsage(usage);
  }, []);

  useEffect(() => {
    refreshTokenUsage();
    // Refresh when screen comes back into focus
    const unsubscribe = navigation.addListener('focus', refreshTokenUsage);
    return unsubscribe;
  }, [navigation, refreshTokenUsage]);

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
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  // ─── Generate ─────────────────────────────────────────────
  const handleGenerate = () => {
    const trimmedTopic = topic.trim();

    if (trimmedTopic.length < 3 && !uploadedFile) {
      Alert.alert(
        'Input Required',
        'Please enter a topic (at least 3 characters) or upload a file.'
      );
      return;
    }

    navigation.navigate('Processing', {
      topic: trimmedTopic || 'Uploaded Document',
      language: selectedLanguage.name,
      languageCode: selectedLanguage.code,
      uploadedFileUri:
        uploadedFile && !uploadedFile.canceled ? uploadedFile.assets[0].uri : null,
      uploadedFileName:
        uploadedFile && !uploadedFile.canceled ? uploadedFile.assets[0].name : null,
    });
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Top Bar — Settings */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsBtnIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>✍️</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI Writer</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Generate professional documents instantly
          </Text>
        </View>

        {/* Premium Banner */}
        <TouchableOpacity
          style={styles.premiumBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Premium')}
        >
          <View style={[styles.premiumBannerInner, { backgroundColor: colors.headerBg }]}>
            <Text style={styles.premiumBannerIcon}>👑</Text>
            <View style={styles.premiumBannerText}>
              <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
              <Text style={[styles.premiumBannerSub, { color: colors.textMuted }]}>Unlimited generations — Coming Soon</Text>
            </View>
            <Text style={[styles.premiumBannerArrow, { color: colors.primary }]}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Topic Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>What would you like to write about?</Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.inputText,
            }]}
            placeholder="Enter your topic here..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={topic}
            onChangeText={setTopic}
          />
        </View>

        {/* File Upload */}
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleFileUpload}
        >
          <Text style={styles.uploadIcon}>📎</Text>
          <Text style={[styles.uploadText, { color: colors.textMuted }]}>
            {uploadedFile && !uploadedFile.canceled
              ? `📄 ${uploadedFile.assets[0].name}`
              : 'Upload a file (PDF, Word, Excel, PPT, TXT)'}
          </Text>
        </TouchableOpacity>

        {/* Language Selector */}
        <View style={styles.languageSection}>
          <View style={styles.languageLabelRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Output Language</Text>
            <Text style={[styles.autoDetectedBadge, { color: colors.primary, backgroundColor: colors.primaryLight }]}>
              Auto-detected
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.languageButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
          >
            <Text style={[styles.languageText, { color: colors.textPrimary }]}>
              🌐 {selectedLanguage.name} ({selectedLanguage.nativeName})
            </Text>
            <Text style={[styles.languageArrow, { color: colors.textMuted }]}>▼</Text>
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
                      lang.code === selectedLanguage.code && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => {
                      setSelectedLanguage(lang);
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

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: colors.headerBg, shadowColor: colors.shadowColor }]}
          onPress={handleGenerate}
        >
          <Text style={styles.generateText}>✨ Generate Files</Text>
        </TouchableOpacity>

        {/* Feature Cards — Translate & Summarize */}
        <View style={styles.featureSection}>
          <Text style={[styles.featureSectionTitle, { color: colors.textPrimary }]}>More Tools</Text>
          <View style={styles.featureCards}>
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Translate')}
            >
              <Text style={styles.featureCardIcon}>🌐</Text>
              <Text style={[styles.featureCardTitle, { color: colors.textPrimary }]}>Translate</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textMuted }]}>
                Translate any document to another language
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Summarize')}
            >
              <Text style={styles.featureCardIcon}>📋</Text>
              <Text style={[styles.featureCardTitle, { color: colors.textPrimary }]}>Summarize</Text>
              <Text style={[styles.featureCardDesc, { color: colors.textMuted }]}>
                Extract key points from any document
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Token Usage */}
        <View style={[styles.tokenBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tokenHeader}>
            <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>⚡ Daily Usage</Text>
            <Text style={[styles.tokenCount, { color: colors.textMuted }]}>
              {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()} tokens
            </Text>
          </View>
          <View style={[styles.tokenTrack, { backgroundColor: colors.borderLight }]}>
            <View style={[
              styles.tokenFill,
              {
                width: `${tokenUsage.percentage}%`,
                backgroundColor: tokenUsage.percentage > 80 ? colors.danger : colors.primary,
              },
            ]} />
          </View>
          <Text style={[styles.tokenRemaining, { color: colors.textMuted }]}>
            {tokenUsage.remaining.toLocaleString()} tokens remaining today
          </Text>
        </View>

        {/* Bottom Links */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity
            style={styles.bottomLink}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={[styles.bottomLinkText, { color: colors.primary }]}>📁 History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomLink}
            onPress={() => navigation.navigate('Privacy')}
          >
            <Text style={[styles.bottomLinkText, { color: colors.textMuted }]}>Privacy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomLink}
            onPress={() => navigation.navigate('Terms')}
          >
            <Text style={[styles.bottomLinkText, { color: colors.textMuted }]}>Terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnIcon: {
    fontSize: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  premiumBanner: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 22,
  },
  premiumBannerInner: {
    backgroundColor: '#2C2E33',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  premiumBannerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  premiumBannerSub: {
    color: '#9D9EA2',
    fontSize: 12,
    marginTop: 2,
  },
  premiumBannerArrow: {
    color: '#C8A961',
    fontSize: 24,
    fontWeight: '300',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 20,
  },
  uploadIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  uploadText: {
    fontSize: 14,
    flex: 1,
  },
  languageSection: {
    marginBottom: 24,
  },
  languageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoDetectedBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  languageText: {
    fontSize: 15,
  },
  languageArrow: {
    fontSize: 12,
  },
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
  languageItemText: {
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: '#2C2E33',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  featureSection: {
    marginBottom: 16,
  },
  featureSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  featureCards: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  featureCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureCardDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  tokenBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tokenCount: {
    fontSize: 12,
  },
  tokenTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  tokenFill: {
    height: '100%',
    borderRadius: 3,
  },
  tokenRemaining: {
    fontSize: 11,
    textAlign: 'center',
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
    marginBottom: 10,
  },
  bottomLink: {
    paddingVertical: 4,
  },
  bottomLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
