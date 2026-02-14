/**
 * AI Writer — Settings Screen
 *
 * App settings including:
 * - Dark / Light / System theme toggle
 * - Premium Plan (Coming Soon)
 * - Privacy Policy link
 * - Terms of Service link
 * - App version info
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../utils/themeContext';
import { useTranslation, APP_LANGUAGES } from '../i18n/i18nContext';
import { getUsageDisplay, DAILY_TOKEN_LIMIT } from '../utils/tokenUsage';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { mode, isDark, colors, setMode } = useTheme();
  const { t, language, preference, setLanguage } = useTranslation();
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: DAILY_TOKEN_LIMIT, remaining: DAILY_TOKEN_LIMIT, percentage: 0 });
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Refresh token usage every time Settings screen is focused
  useFocusEffect(
    useCallback(() => {
      getUsageDisplay().then(setTokenUsage);
    }, [])
  );

  const themeOptions: Array<{ label: string; value: 'light' | 'dark' | 'system'; icon: string }> = [
    { label: t('theme_light'), value: 'light', icon: '☀️' },
    { label: t('theme_dark'), value: 'dark', icon: '🌙' },
    { label: t('theme_system'), value: 'system', icon: '⚙️' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('settings_title')}</Text>
      </View>

      {/* ─── Appearance Section ──────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings_appearance_section').toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings_theme_title')}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          {t('settings_theme_subtitle')}
        </Text>

        <View style={styles.themeOptions}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.themeOption,
                {
                  backgroundColor: mode === opt.value ? colors.primaryLight : colors.surfaceAlt,
                  borderColor: mode === opt.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setMode(opt.value)}
            >
              <Text style={styles.themeIcon}>{opt.icon}</Text>
              <Text
                style={[
                  styles.themeLabel,
                  { color: mode === opt.value ? colors.primary : colors.textSecondary },
                  mode === opt.value && styles.themeLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── Language Section ────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings_language_section').toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings_app_language_title')}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t('settings_app_language_subtitle')}</Text>
        <TouchableOpacity
          style={[styles.langPickerBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => setShowLangPicker(!showLangPicker)}
        >
          <Text style={[styles.langPickerText, { color: colors.textPrimary }]}>
            {APP_LANGUAGES.find(l => l.code === preference)?.nativeName || t('settings_language_auto')}
          </Text>
          <Text style={[styles.langPickerArrow, { color: colors.textMuted }]}>{showLangPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showLangPicker && (
          <View style={[styles.langDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 260 }}>
              {APP_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langDropdownItem,
                    { borderBottomColor: colors.borderLight },
                    lang.code === preference && { backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => { setLanguage(lang.code); setShowLangPicker(false); }}
                >
                  <Text style={[styles.langDropdownLabel, { color: lang.code === preference ? colors.primary : colors.textPrimary }]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.langDropdownSub, { color: colors.textMuted }]}>{lang.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ─── Daily Usage Section ─────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings_daily_usage_section').toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.usageRow}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{t('settings_token_usage_title')}</Text>
          <Text style={[styles.usageCount, { color: colors.textMuted }]}>
            {tokenUsage.used.toLocaleString()} / {tokenUsage.limit.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.usageTrack, { backgroundColor: colors.borderLight }]}>
          <View style={[
            styles.usageFill,
            {
              width: `${tokenUsage.percentage}%`,
              backgroundColor: tokenUsage.percentage > 80 ? colors.danger : colors.primary,
            },
          ]} />
        </View>
        <Text style={[styles.usageNote, { color: colors.textMuted }]}>
          {t('settings_usage_note', { n: tokenUsage.remaining.toLocaleString() })}
        </Text>
      </View>

      {/* ─── Premium Section ─────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings_subscription_section').toUpperCase()}</Text>
      <TouchableOpacity
        style={[styles.premiumCard, { borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Premium')}
      >
        <View style={styles.premiumGradient}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>{t('settings_coming_soon_badge').toUpperCase()}</Text>
          </View>
          <Text style={styles.premiumIcon}>👑</Text>
          <Text style={styles.premiumTitle}>{t('settings_premium_title')}</Text>
          <Text style={styles.premiumSubtitle}>
            {t('settings_premium_subtitle')}
          </Text>
          <View style={styles.premiumFeatures}>
            <Text style={styles.premiumFeature}>{t('settings_premium_feature_1')}</Text>
            <Text style={styles.premiumFeature}>{t('settings_premium_feature_2')}</Text>
            <Text style={styles.premiumFeature}>{t('settings_premium_feature_3')}</Text>
            <Text style={styles.premiumFeature}>{t('settings_premium_feature_4')}</Text>
            <Text style={styles.premiumFeature}>{t('settings_premium_feature_5')}</Text>
          </View>
          <View style={styles.premiumBtn}>
            <Text style={styles.premiumBtnText}>{t('settings_learn_more')}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ─── Legal Section ────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('settings_legal_section').toUpperCase()}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={[styles.menuIcon]}>🔒</Text>
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t('settings_privacy_policy')}</Text>
          <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Terms')}
        >
          <Text style={[styles.menuIcon]}>📋</Text>
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{t('settings_terms_of_service')}</Text>
          <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ─── About ───────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>{t('settings_version')}</Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {t('settings_powered_by')}
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 26, fontWeight: '700' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, marginBottom: 16 },

  // Usage
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  usageCount: { fontSize: 13 },
  usageTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  usageFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageNote: { fontSize: 12, textAlign: 'center' },

  // Theme
  themeOptions: { flexDirection: 'row', gap: 10 },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeIcon: { fontSize: 24, marginBottom: 6 },
  themeLabel: { fontSize: 13, fontWeight: '500' },
  themeLabelActive: { fontWeight: '700' },

  // Premium
  premiumCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  premiumGradient: {
    backgroundColor: '#2C2E33',
    padding: 24,
    alignItems: 'center',
  },
  premiumBadge: {
    backgroundColor: '#C8A961',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  premiumBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  premiumIcon: { fontSize: 44, marginBottom: 10 },
  premiumTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: '#9D9EA2',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  premiumFeatures: { alignSelf: 'stretch', marginBottom: 20 },
  premiumFeature: {
    fontSize: 14,
    color: '#D5D5DA',
    marginBottom: 8,
    paddingLeft: 4,
  },
  premiumBtn: {
    backgroundColor: '#C8A961',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  premiumBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  menuArrow: { fontSize: 22, fontWeight: '300' },

  // Language Picker
  langPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  langPickerText: { fontSize: 15, fontWeight: '500' },
  langPickerArrow: { fontSize: 12 },
  langDropdown: { borderRadius: 12, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  langDropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  langDropdownLabel: { fontSize: 15, fontWeight: '600' },
  langDropdownSub: { fontSize: 12 },

  // Footer
  footer: { alignItems: 'center', marginTop: 24, marginBottom: 20 },
  footerText: { fontSize: 12, marginBottom: 4 },
});
