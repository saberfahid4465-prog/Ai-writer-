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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useTheme } from '../utils/themeContext';
import { getUsageDisplay, DAILY_TOKEN_LIMIT } from '../utils/tokenUsage';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { mode, isDark, colors, setMode } = useTheme();
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: DAILY_TOKEN_LIMIT, remaining: DAILY_TOKEN_LIMIT, percentage: 0 });

  useEffect(() => {
    getUsageDisplay().then(setTokenUsage);
  }, []);

  const themeOptions: Array<{ label: string; value: 'light' | 'dark' | 'system'; icon: string }> = [
    { label: 'Light', value: 'light', icon: '☀️' },
    { label: 'Dark', value: 'dark', icon: '🌙' },
    { label: 'System', value: 'system', icon: '⚙️' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>⚙️ Settings</Text>
      </View>

      {/* ─── Appearance Section ──────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APPEARANCE</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Theme</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          Choose how AI Writer looks
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

      {/* ─── Daily Usage Section ─────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DAILY USAGE</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.usageRow}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>⚡ Token Usage</Text>
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
          {tokenUsage.remaining.toLocaleString()} tokens remaining • Resets daily at midnight
        </Text>
      </View>

      {/* ─── Premium Section ─────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SUBSCRIPTION</Text>
      <TouchableOpacity
        style={[styles.premiumCard, { borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Premium')}
      >
        <View style={styles.premiumGradient}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>COMING SOON</Text>
          </View>
          <Text style={styles.premiumIcon}>👑</Text>
          <Text style={styles.premiumTitle}>AI Writer Premium</Text>
          <Text style={styles.premiumSubtitle}>
            Unlimited generations, priority AI, custom templates, and more
          </Text>
          <View style={styles.premiumFeatures}>
            <Text style={styles.premiumFeature}>✦ Unlimited document generations</Text>
            <Text style={styles.premiumFeature}>✦ Priority AI processing</Text>
            <Text style={styles.premiumFeature}>✦ Custom branding & templates</Text>
            <Text style={styles.premiumFeature}>✦ Advanced export options</Text>
            <Text style={styles.premiumFeature}>✦ No watermarks</Text>
          </View>
          <View style={styles.premiumBtn}>
            <Text style={styles.premiumBtnText}>Learn More →</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ─── Legal Section ────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LEGAL</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={[styles.menuIcon]}>🔒</Text>
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Privacy Policy</Text>
          <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Terms')}
        >
          <Text style={[styles.menuIcon]}>📋</Text>
          <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Terms of Service</Text>
          <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ─── About ───────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>AI Writer v1.0.0</Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Powered by Longcat AI
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

  // Footer
  footer: { alignItems: 'center', marginTop: 24, marginBottom: 20 },
  footerText: { fontSize: 12, marginBottom: 4 },
});
