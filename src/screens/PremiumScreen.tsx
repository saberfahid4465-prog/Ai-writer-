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
import { useTranslation } from '../i18n/i18nContext';

interface PremiumScreenProps {
  navigation: any;
}

export default function PremiumScreen({ navigation }: PremiumScreenProps) {
  const { isDark, colors } = useTheme();
  const { t } = useTranslation();

  const handlePurchase = () => {
    Alert.alert(
      t('alert_coming_soon_title'),
      t('alert_coming_soon_msg'),
      [{ text: t('alert_ok') }]
    );
  };

  const FREE_FEATURES = [
    t('premium_free_feature_1'),
    t('premium_free_feature_2'),
    t('premium_free_feature_3'),
    t('premium_free_feature_4'),
    t('premium_free_feature_5'),
  ];

  const PREMIUM_FEATURES = [
    t('premium_feature_1'),
    t('premium_feature_2'),
    t('premium_feature_3'),
    t('premium_feature_4'),
    t('premium_feature_5'),
    t('premium_feature_6'),
    t('premium_feature_7'),
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scroll}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>{t('premium_back')}</Text>
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Image source={isDark ? require('../../assets/logo.png') : require('../../assets/logo-light.png')} style={styles.heroLogo} resizeMode="contain" />
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          {t('premium_hero_title')}
        </Text>
        <Text style={[styles.heroSub, { color: colors.textMuted }]}>
          {t('premium_hero_subtitle')}
        </Text>
      </View>

      {/* ── Free Plan Card ───────────────────────────────── */}
      <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{t('premium_current_plan_badge').toUpperCase()}</Text>
        </View>
        <Text style={[styles.planName, { color: colors.textPrimary }]}>{t('premium_free_name')}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.textPrimary }]}>{t('premium_free_price')}</Text>
          <Text style={[styles.period, { color: colors.textMuted }]}> {t('premium_free_period')}</Text>
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
          <Text style={[styles.planBtnText, { color: colors.textMuted }]}>{t('premium_free_btn')}</Text>
        </View>
      </View>

      {/* ── Premium Plan Card ────────────────────────────── */}
      <View style={[styles.planCard, { backgroundColor: '#2C2E33', borderColor: '#C8A961' }]}>
        <View style={[styles.badge, { backgroundColor: '#C8A961' }]}>
          <Text style={styles.badgeText}>{t('premium_recommended_badge').toUpperCase()}</Text>
        </View>
        <Text style={[styles.planName, { color: '#FFFFFF' }]}>{t('premium_name')}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: '#FFFFFF' }]}>{t('premium_price')}</Text>
          <Text style={[styles.period, { color: '#9D9EA2' }]}> {t('premium_period')}</Text>
        </View>
        <Text style={[styles.planHighlight, { color: '#C8A961' }]}>
          {t('premium_highlight')}
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
            {t('premium_buy_btn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Comparison ───────────────────────────────────── */}
      <View style={[styles.compareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.compareTitle, { color: colors.textPrimary }]}>{t('premium_compare_title')}</Text>
        <View style={styles.compareRow}>
          <Text style={[styles.compareLabel, { color: colors.textMuted }]}>{t('premium_compare_tokens_label')}</Text>
          <Text style={[styles.compareVal, { color: colors.textSecondary }]}>{t('premium_compare_tokens_free')}</Text>
          <Text style={[styles.compareValPremium, { color: '#C8A961' }]}>{t('premium_compare_tokens_premium')}</Text>
        </View>
        <View style={[styles.compareDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.compareRow}>
          <Text style={[styles.compareLabel, { color: colors.textMuted }]}>{t('premium_compare_price_label')}</Text>
          <Text style={[styles.compareVal, { color: colors.textSecondary }]}>{t('premium_compare_price_free')}</Text>
          <Text style={[styles.compareValPremium, { color: '#C8A961' }]}>{t('premium_compare_price_premium')}</Text>
        </View>
        <View style={[styles.compareDivider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.compareRow}>
          <Text style={[styles.compareLabel, { color: colors.textMuted }]}>{t('premium_compare_ai_label')}</Text>
          <Text style={[styles.compareVal, { color: colors.textSecondary }]}>{t('premium_compare_ai_free')}</Text>
          <Text style={[styles.compareValPremium, { color: '#C8A961' }]}>{t('premium_compare_ai_premium')}</Text>
        </View>
      </View>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.faqTitle, { color: colors.textPrimary }]}>{t('premium_faq_title')}</Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{t('premium_faq_q1')}</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          {t('premium_faq_a1')}
        </Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{t('premium_faq_q2')}</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          {t('premium_faq_a2')}
        </Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{t('premium_faq_q3')}</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          {t('premium_faq_a3')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {t('premium_footer')}
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
