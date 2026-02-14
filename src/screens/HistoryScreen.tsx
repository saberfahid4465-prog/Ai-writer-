/**
 * AI Writer — History Screen
 *
 * Displays previously generated file sets.
 * Users can re-view, re-download, or delete past generations.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { HistoryEntry, loadHistory, deleteHistoryEntry, clearAllHistory } from '../utils/fileStorage';
import { useTheme } from '../utils/themeContext';
import { useTranslation } from '../i18n/i18nContext';

// ─── Types ──────────────────────────────────────────────────────

interface HistoryScreenProps {
  navigation: any;
}

// ─── Component ──────────────────────────────────────────────────

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Reload history whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchHistory = async () => {
        setLoading(true);
        const entries = await loadHistory();
        setHistory(entries);
        setLoading(false);
      };
      fetchHistory();
    }, [])
  );

  // ─── Delete Single Entry ──────────────────────────────────
  const handleDelete = (entry: HistoryEntry) => {
    Alert.alert(
      t('alert_delete_gen_title'),
      t('alert_delete_gen_msg', { topic: entry.topic }),
      [
        { text: t('alert_cancel'), style: 'cancel' },
        {
          text: t('alert_delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteHistoryEntry(entry.id);
            setHistory((prev) => prev.filter((h) => h.id !== entry.id));
          },
        },
      ]
    );
  };

  // ─── Clear All ────────────────────────────────────────────
  const handleClearAll = () => {
    Alert.alert(
      t('alert_clear_all_title'),
      t('alert_clear_all_msg'),
      [
        { text: t('alert_cancel'), style: 'cancel' },
        {
          text: t('alert_clear_all_btn'),
          style: 'destructive',
          onPress: async () => {
            await clearAllHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  // ─── View Entry ───────────────────────────────────────────
  const handleView = (entry: HistoryEntry) => {
    navigation.navigate('Result', {
      topic: entry.topic,
      language: entry.language,
      files: entry.files,
    });
  };

  // ─── Format Date ──────────────────────────────────────────
  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ─── Render Item ──────────────────────────────────────────
  const renderItem = ({ item }: { item: HistoryEntry }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>📄</Text>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTopic, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.topic}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
            {formatDate(item.createdAt)} • {item.language}
          </Text>
          <Text style={[styles.cardFiles, { color: colors.primary }]}>
            {item.files.map((f) => f.type.toUpperCase()).join(', ')}
          </Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: colors.primaryLight }]}
          onPress={() => handleView(item)}
        >
          <Text style={[styles.viewButtonText, { color: colors.primary }]}>{t('history_view')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardButton, { backgroundColor: colors.dangerLight }]}
          onPress={() => handleDelete(item)}
        >
          <Text style={[styles.deleteButtonText, { color: colors.danger }]}>{t('history_delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Empty State ──────────────────────────────────────────
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📁</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('history_empty_title')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        {t('history_empty_subtitle')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('HomeTabs')}
      >
        <Text style={styles.emptyButtonText}>{t('history_empty_btn')}</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('history_title')}</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={[styles.clearAllText, { color: colors.danger }]}>{t('history_clear_all')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={loading ? null : renderEmpty}
        contentContainerStyle={
          history.length === 0 ? styles.listEmpty : styles.listContent
        }
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 4,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTopic: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  cardFiles: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
