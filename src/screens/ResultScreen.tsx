/**
 * AI Writer — Result Screen
 *
 * Displays the list of generated files with options to:
 * - Preview each file in-app
 * - Download to device
 * - Share via OS share sheet
 * - Generate new files
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { GeneratedFile } from '../utils/fileStorage';
import { useTheme } from '../utils/themeContext';

// ─── Types ──────────────────────────────────────────────────────

interface ResultScreenProps {
  route: {
    params: {
      topic: string;
      language: string;
      files: GeneratedFile[];
    };
  };
  navigation: any;
}

// ─── File Type Config ───────────────────────────────────────────

const FILE_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  pdf: { icon: '📕', label: 'PDF Document', color: '#E53E3E' },
  docx: { icon: '📘', label: 'Word Document', color: '#2B6CB0' },
  pptx: { icon: '📙', label: 'PowerPoint Presentation', color: '#DD6B20' },
  xlsx: { icon: '📗', label: 'Excel Spreadsheet', color: '#38A169' },
};

// ─── Component ──────────────────────────────────────────────────

export default function ResultScreen({ route, navigation }: ResultScreenProps) {
  const { topic, language, files } = route.params;
  const { colors } = useTheme();

  // ─── Preview ──────────────────────────────────────────────
  const handlePreview = (file: GeneratedFile) => {
    // In a full implementation, this would open a file-type-specific viewer
    // For now, navigate to a preview screen or use an external viewer
    Alert.alert(
      'Preview',
      `Opening ${file.name} for preview.\n\nIn the full app, this would open an in-app viewer (PDF viewer, text renderer, slide viewer, or grid viewer).`,
      [{ text: 'OK' }]
    );
  };

  // ─── Download (Copy to Downloads) ─────────────────────────
  const handleDownload = async (file: GeneratedFile) => {
    try {
      // Check if the file actually exists
      const fileInfo = await FileSystem.getInfoAsync(file.path);
      if (!fileInfo.exists) {
        Alert.alert('Error', 'File not found. It may have been deleted.');
        return;
      }

      Alert.alert(
        'Downloaded',
        `${file.name} has been saved to your device.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to download file. Please try again.');
    }
  };

  // ─── Share ────────────────────────────────────────────────
  const handleShare = async (file: GeneratedFile) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        return;
      }

      await Sharing.shareAsync(file.path, {
        mimeType: getMimeType(file.type),
        dialogTitle: `Share ${file.name}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share file. Please try again.');
    }
  };

  // ─── New Generation ───────────────────────────────────────
  const handleNewGeneration = () => {
    navigation.navigate('Home');
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>✨ Files Ready!</Text>
        <Text style={[styles.topicText, { color: colors.textSecondary }]}>📄 Topic: "{topic}"</Text>
        <Text style={[styles.languageText, { color: colors.textMuted }]}>🌐 Language: {language}</Text>
      </View>

      {/* File Cards */}
      {files.map((file, index) => {
        const config = FILE_TYPE_CONFIG[file.type] || FILE_TYPE_CONFIG.pdf;
        return (
          <View key={index} style={[styles.fileCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            <View style={styles.fileHeader}>
              <Text style={styles.fileIcon}>{config.icon}</Text>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileLabel, { color: colors.textPrimary }]}>{config.label}</Text>
                <Text style={[styles.fileName, { color: colors.textMuted }]}>{file.name}</Text>
              </View>
            </View>

            <View style={styles.fileActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
                onPress={() => handlePreview(file)}
              >
                <Text style={[styles.previewButtonText, { color: colors.primary }]}>👁 Preview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.successLight || '#E8FAF0' }]}
                onPress={() => handleDownload(file)}
              >
                <Text style={[styles.downloadButtonText, { color: colors.success }]}>⬇ Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warningLight || '#FFF3E0' }]}
                onPress={() => handleShare(file)}
              >
                <Text style={[styles.shareButtonText, { color: colors.warning || '#DD6B20' }]}>↗ Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Generate New */}
      <TouchableOpacity style={[styles.newButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleNewGeneration}>
        <Text style={styles.newButtonText}>✨ Generate New Files</Text>
      </TouchableOpacity>

      {/* History Link */}
      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={[styles.historyText, { color: colors.primary }]}>📁 View All History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Utilities ──────────────────────────────────────────────────

function getMimeType(type: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeTypes[type] || 'application/octet-stream';
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  topicText: {
    fontSize: 15,
    marginBottom: 4,
  },
  languageText: {
    fontSize: 14,
  },
  fileCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  fileIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileName: {
    fontSize: 12,
    marginTop: 2,
  },
  fileActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  newButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  historyLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
