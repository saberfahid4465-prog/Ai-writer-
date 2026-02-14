/**
 * FilePreview Component
 *
 * Placeholder for in-app file viewing.
 * In production, this would use:
 * - react-native-pdf for PDFs
 * - Scrollable text for Word content
 * - Slide-by-slide for PPT
 * - Grid/table for Excel
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../utils/themeContext';

interface FilePreviewProps {
  fileType: string;
  fileName: string;
}

export default function FilePreview({ fileType, fileName }: FilePreviewProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.icon}>
          {fileType === 'pdf' ? '📕' : fileType === 'docx' ? '📘' : fileType === 'pptx' ? '📙' : '📗'}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Preview: {fileName}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          In-app preview for .{fileType} files will be rendered here.
        </Text>
        <Text style={styles.note}>
          {fileType === 'pdf' && 'Uses react-native-pdf for PDF rendering.'}
          {fileType === 'docx' && 'Word content displayed as scrollable formatted text.'}
          {fileType === 'pptx' && 'Slides displayed in a horizontal swipe viewer.'}
          {fileType === 'xlsx' && 'Data displayed in a scrollable grid/table.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 300 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
  note: { fontSize: 12, color: '#999', textAlign: 'center', fontStyle: 'italic' },
});
