/**
 * FileCard Component
 *
 * Displays a single generated file with its type icon,
 * name, and action buttons (preview, download, share).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GeneratedFile } from '../utils/fileStorage';
import { useTheme } from '../utils/themeContext';

interface FileCardProps {
  file: GeneratedFile;
  onPreview: (file: GeneratedFile) => void;
  onDownload: (file: GeneratedFile) => void;
  onShare: (file: GeneratedFile) => void;
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📕',
  docx: '📘',
  pptx: '📙',
  xlsx: '📗',
};

const FILE_LABELS: Record<string, string> = {
  pdf: 'PDF Document',
  docx: 'Word Document',
  pptx: 'PowerPoint',
  xlsx: 'Excel Spreadsheet',
};

export default function FileCard({ file, onPreview, onDownload, onShare }: FileCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{FILE_ICONS[file.type] || '📄'}</Text>
        <View style={styles.info}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{FILE_LABELS[file.type] || file.type}</Text>
          <Text style={[styles.name, { color: colors.textMuted }]} numberOfLines={1}>{file.name}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.inputBackground }]} onPress={() => onPreview(file)}>
          <Text style={[styles.btnText, { color: colors.primary }]}>👁 Preview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.inputBackground }]} onPress={() => onDownload(file)}>
          <Text style={[styles.btnText, { color: '#22C55E' }]}>⬇ Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.inputBackground }]} onPress={() => onShare(file)}>
          <Text style={[styles.btnText, { color: '#DD6B20' }]}>↗ Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  icon: { fontSize: 30, marginRight: 12 },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600' },
  name: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { fontSize: 13, fontWeight: '600' },
});
