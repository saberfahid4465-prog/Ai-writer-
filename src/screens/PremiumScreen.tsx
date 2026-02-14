/**
 * AI Writer — Premium Plan Screen
 *
 * Showcases upcoming premium features.
 * All plans marked as "Coming Soon" — no purchase possible yet.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../utils/themeContext';

interface PremiumScreenProps {
  navigation: any;
}

export default function PremiumScreen({ navigation }: PremiumScreenProps) {
  const { colors } = useTheme();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      badge: 'CURRENT PLAN',
      badgeColor: '#C8A961',
      features: [
        '5 document generations / day',
        'PDF, Word, PPT, Excel output',
        'All languages supported',
        'In-app file preview',
        'Basic templates',
      ],
      isCurrent: true,
    },
    {
      name: 'Pro',
      price: '$4.99',
      period: '/month',
      badge: 'COMING SOON',
      badgeColor: '#C8A961',
      features: [
        'Unlimited generations',
        'Priority AI processing',
        'Custom branding & logos',
        'Advanced templates',
        'No watermarks',
        'Email support',
      ],
      isCurrent: false,
    },
    {
      name: 'Business',
      price: '$14.99',
      period: '/month',
      badge: 'COMING SOON',
      badgeColor: '#C8A961',
      features: [
        'Everything in Pro',
        'Team collaboration (5 users)',
        'API access',
        'Custom AI training',
        'Priority support',
        'Advanced analytics',
        'White-label export',
      ],
      isCurrent: false,
    },
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
        <Text style={styles.heroIcon}>👑</Text>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          Upgrade to Premium
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          Unlock the full power of AI Writer with unlimited generations, advanced templates, and priority AI processing.
        </Text>
      </View>

      {/* Plans */}
      {plans.map((plan, index) => (
        <View
          key={plan.name}
          style={[
            styles.planCard,
            {
              backgroundColor: plan.isCurrent ? colors.card : '#2C2E33',
              borderColor: plan.isCurrent ? colors.border : '#45464A',
            },
          ]}
        >
          {/* Badge */}
          <View style={[styles.planBadge, { backgroundColor: plan.badgeColor }]}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>

          {/* Plan Name & Price */}
          <Text style={[styles.planName, { color: plan.isCurrent ? colors.textPrimary : '#F0F0F2' }]}>
            {plan.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.planPrice, { color: plan.isCurrent ? colors.textPrimary : '#FFFFFF' }]}>
              {plan.price}
            </Text>
            <Text style={[styles.planPeriod, { color: plan.isCurrent ? colors.textMuted : '#9D9EA2' }]}>
              {plan.period}
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featureList}>
            {plan.features.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={[styles.featureCheck, { color: plan.isCurrent ? colors.success : '#4ADE80' }]}>
                  ✓
                </Text>
                <Text style={[styles.featureText, { color: plan.isCurrent ? colors.textSecondary : '#C8C9CD' }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* CTA Button */}
          {plan.isCurrent ? (
            <View style={[styles.planBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.planBtnText, { color: colors.textMuted }]}>Current Plan</Text>
            </View>
          ) : (
            <View style={[styles.planBtn, { backgroundColor: '#C8A961', opacity: 0.8 }]}>
              <Text style={[styles.planBtnText, { color: '#FFF' }]}>Coming Soon</Text>
            </View>
          )}
        </View>
      ))}

      {/* FAQ */}
      <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.faqTitle, { color: colors.textPrimary }]}>Frequently Asked Questions</Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>When will Premium be available?</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          We're working hard to bring Premium features to AI Writer. Stay tuned for announcements!
        </Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>Will my free plan data carry over?</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          Yes! All your generated documents and history will be preserved when you upgrade.
        </Text>

        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>Can I cancel anytime?</Text>
        <Text style={[styles.faqA, { color: colors.textMuted }]}>
          Absolutely. Premium subscriptions can be cancelled at any time with no penalty.
        </Text>
      </View>

      {/* Notify */}
      <View style={styles.notifySection}>
        <Text style={[styles.notifyText, { color: colors.textMuted }]}>
          We'll notify you when Premium plans become available.
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
  heroIcon: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },

  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  planBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },
  planBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 18 },
  planPrice: { fontSize: 36, fontWeight: '800' },
  planPeriod: { fontSize: 14, marginLeft: 4 },
  featureList: { alignSelf: 'stretch', marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureCheck: { fontSize: 16, fontWeight: '700', marginRight: 10 },
  featureText: { fontSize: 14, flex: 1 },
  planBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  planBtnText: { fontSize: 15, fontWeight: '700' },

  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    marginTop: 8,
  },
  faqTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  faqQ: { fontSize: 14, fontWeight: '600', marginBottom: 4, marginTop: 10 },
  faqA: { fontSize: 13, lineHeight: 19, marginBottom: 6 },

  notifySection: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  notifyText: { fontSize: 13, textAlign: 'center' },
});
