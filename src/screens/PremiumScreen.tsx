/**
 * AI Writer — Premium Plan Screen
 *
 * Single upgrade plan: $3 one-time for 10,000 tokens.
 * Accessible only from Settings (not shown on Home page).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '../utils/themeContext';

interface PremiumScreenProps {
  navigation: any;
}

export default function PremiumScreen({ navigation }: PremiumScreenProps) {
  const { colors } = useTheme();

  const handlePurchase = () => {
    Alert.alert(
      'Coming Soon',
      'In-app purchases will be available in the next update. Stay tuned!',
      [{ text: 'OK' }]
    );
  };

  const FREE_FEATURES = [
    '5,000 tokens per day',
    'PDF, Word, PPT, Excel output',
    'All 15+ languages',
    'File upload & topic-based generation',
    'Summarize & Translate options',
  ];

  const PREMIUM_FEATURES = [
    '10,000 tokens per day',
    'Priority AI processing',
    'Larger documents & longer content',
    'All output formats included',
    'All languages + auto-detect',
    'Tables & charts in Excel/PPT',
    'Priority support',
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
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Image source={require('../../assets/logo.png')} style={styles.heroLogo} resizeMode="contain" />
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Upgrade to Premium
        </Text>
        <Text style={[styles.heroSub, { color: colors.textMuted }]}>
          Double your daily token limit for just $3
        </Text>
      </View>

      {/* ── Free Plan Card ───────────────────────────────── */}
      <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>CURRENT PLAN</Text>
        </View>
        <Text style={[styles.planName, { color: colors.textPrimary }]}>Free</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.textPrimary }]}>$0</Text>
          <Text style={[styles.period, { color: colors.textMuted }]}> / forever</Text>
        </View>
        <View style={styles.featureList}>
          {FREE_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.check, { color: colors.success }]}>✓</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.planBtn, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.planBtnText, { color: colors.textMuted }]}>Current Plan</Text>
        </View>
      </View>

      {/* ── Premium Plan Card ────────────────────────────── */}
      <View style={[styles.planCard, { backgroundColor: '#2C2E33', borderColor: '#C8A961' }]}>
        <View style={[styles.badge, { backgroundColor: '#C8A961' }]}>
          <Text style={styles.badgeText}>RECOMMENDED</Text>
        </View>
        <Text style={[styles.planName, { color: '#FFFFFF' }]}>Premium</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: '#FFFFFF' }]}>$3</Text>
          <Text style={[styles.period, { color: '#9D9EA2' }]}> / one-time</Text>
        </View>
        <Text style={[styles.planHighlight, { color: '#C8A961' }]}>
          10,000 tokens / day — double the free plan!
        </Text>
        <View style={styles.featureList}>
          {PREMIUM_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.check, { color: '#4ADE80' }]}>✓</Text>
              <Text style={[styles.featureText, { color: '#D5D5DA' }]}>{f}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.planBtn, { backgroundColor: '#C8A961' }]}
          onPress={handlePurchase}
          activeOpacity={0.85}
        >
          <Text style={[styles.planBtnText, { color: '#FFF' }]}>
            Upgrade for $3 →
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Comparison ───────────────────────────────────── */}
      <View style={[styles.compareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.compareTitle, { color: colors.textPrimary }]}>Quick Comparison</Text>
        <View style={styles.compareRow}>
          <Text style={[styles.compareLabel, { color: colors.textMuted }]}>Daily tokens</Text>
          <Text style={[styles.compareVal, { color: colors.textSecondary }]}>5,000</Text>
          <Text style={[styles.compareValPremium, { color: '#C8A961' }]}>10,000</Text>
        </View>
        <View style={[styles.compareDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.compareRow}>
          <Text style={[styles.compareLabel, { color: colors.textMuted }]}>Price</Text>
          <Text style={[styles.compareVal, { color: colors.textSecondary }]}>Free</Text>
          <Text style={[styles.compareValPremium, { color: '#C8A961' }]}>$3 once</Text>
        </View>
        <View style={[styles.compareDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.compareRow}>
          <Text style={[styles.compareLabel, { color: colors.textMuted }]}>AI priority</Text>
          <Text style={[styles.compareVal, { color: colors.textSecondary }]}>Standard</Text>
          <Text style={[styles.compareValPremium, { color: '#C8A961' }]}>Priority</Text>
        </View>
      </View>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.faqTitle, { color: colors.textPrimary }]}>FAQ</Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>Is this a subscription?</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          No. It's a one-time payment of $3 that permanently doubles your daily token limit to 10,000.
        </Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>What are tokens?</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          Tokens are the units the AI uses to process your text. About 750 words ≈ 1,000 tokens.
        </Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>When will purchases be available?</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          In-app purchases will be enabled in the next update. Your upgrade will apply instantly once available.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Questions? Contact support@aiwriter.app
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 8 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: '500' },

  hero: { alignItems: 'center', marginBottom: 28 },
  heroLogo: { width: 64, height: 64, borderRadius: 16, marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  planName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  price: { fontSize: 40, fontWeight: '800' },
  period: { fontSize: 14, marginLeft: 4 },
  planHighlight: { fontSize: 14, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  featureList: { alignSelf: 'stretch', marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  check: { fontSize: 16, fontWeight: '700', marginRight: 10, width: 20 },
  featureText: { fontSize: 14, flex: 1 },
  planBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  planBtnText: { fontSize: 16, fontWeight: '700' },

  compareCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  compareTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  compareLabel: { flex: 1, fontSize: 14 },
  compareVal: { width: 80, textAlign: 'center', fontSize: 14 },
  compareValPremium: { width: 80, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  compareDivider: { height: 1, marginVertical: 2 },

  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  faqTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  faqQ: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  faqA: { fontSize: 13, lineHeight: 19 },

  footer: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  footerText: { fontSize: 13, textAlign: 'center' },
});
