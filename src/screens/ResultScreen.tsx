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
  Platform,
  ToastAndroid,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import { GeneratedFile } from '../utils/fileStorage';
import { useTheme } from '../utils/themeContext';
import { useTranslation } from '../i18n/i18nContext';

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

const FILE_TYPE_CONFIG: Record<string, { icon: string; labelKey: string; color: string }> = {
  pdf: { icon: '📕', labelKey: 'filetype_pdf', color: '#E53E3E' },
  docx: { icon: '📘', labelKey: 'filetype_docx', color: '#2B6CB0' },
  pptx: { icon: '📙', labelKey: 'filetype_pptx', color: '#DD6B20' },
  xlsx: { icon: '📗', labelKey: 'filetype_xlsx', color: '#38A169' },
};

// ─── Component ──────────────────────────────────────────────────

export default function ResultScreen({ route, navigation }: ResultScreenProps) {
  const { topic, language, files } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();

  // ─── Preview ──────────────────────────────────────────────
  const handlePreview = async (file: GeneratedFile) => {
    try {
      // Verify the file exists
      const fileInfo = await FileSystem.getInfoAsync(file.path);
      if (!fileInfo.exists) {
        Alert.alert(t('alert_error'), t('alert_file_not_found'));
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('alert_error'), t('alert_sharing_not_available_msg'));
        return;
      }

      // Use share sheet which allows "Open with" external apps
      await Sharing.shareAsync(file.path, {
        mimeType: getMimeType(file.type),
        dialogTitle: file.name,
      });
    } catch (error) {
      console.error('Preview error:', error);
      Alert.alert(t('alert_error'), t('alert_preview_failed'));
    }
  };

  // ─── Download (Direct save to Downloads folder) ───────────
  const handleDownload = async (file: GeneratedFile) => {
    try {
      // Check if the file actually exists
      const fileInfo = await FileSystem.getInfoAsync(file.path);
      if (!fileInfo.exists) {
        Alert.alert(t('alert_error'), t('alert_file_not_found'));
        return;
      }

      if (Platform.OS === 'android') {
        // Use Storage Access Framework to save directly to Downloads
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          // Fallback to share sheet if permission denied
          await Sharing.shareAsync(file.path, {
            mimeType: getMimeType(file.type),
            dialogTitle: t('alert_downloaded_title'),
          });
          return;
        }

        // Read the file content
        const fileContent = await FileSystem.readAsStringAsync(file.path, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Create file in the selected directory
        const newFileUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          file.name,
          getMimeType(file.type)
        );

        // Write content to the new file
        await FileSystem.writeAsStringAsync(newFileUri, fileContent, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Show success toast
        ToastAndroid.show(`✅ ${file.name} saved!`, ToastAndroid.SHORT);
      } else {
        // iOS: Use share sheet (standard iOS behavior)
        await Sharing.shareAsync(file.path, {
          mimeType: getMimeType(file.type),
          dialogTitle: t('alert_downloaded_title'),
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(t('alert_error'), t('alert_download_failed'));
    }
  };

  // ─── Share ────────────────────────────────────────────────
  const handleShare = async (file: GeneratedFile) => {
    try {
      // Verify the file exists before attempting to share
      const fileInfo = await FileSystem.getInfoAsync(file.path);
      if (!fileInfo.exists) {
        Alert.alert(t('alert_error'), t('alert_file_not_found'));
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t('alert_sharing_not_available_title'), t('alert_sharing_not_available_msg'));
        return;
      }

      await Sharing.shareAsync(file.path, {
        mimeType: getMimeType(file.type),
        dialogTitle: `Share ${file.name}`,
      });
    } catch (error) {
      Alert.alert(t('alert_error'), t('alert_share_failed'));
    }
  };

  // ─── New Generation ───────────────────────────────────────
  const handleNewGeneration = () => {
    navigation.navigate('HomeTabs');
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scroll}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('result_title')}</Text>
        <Text style={[styles.topicText, { color: colors.textSecondary }]}>{t('result_topic_prefix', { topic })}</Text>
        <Text style={[styles.languageText, { color: colors.textMuted }]}>{t('result_language_prefix', { language })}</Text>
      </View>

      {/* File Cards */}
      {files.map((file, index) => {
        const config = FILE_TYPE_CONFIG[file.type] || FILE_TYPE_CONFIG.pdf;
        return (
          <View key={index} style={[styles.fileCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            <View style={styles.fileHeader}>
              <Text style={styles.fileIcon}>{config.icon}</Text>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileLabel, { color: colors.textPrimary }]}>{t(config.labelKey as any)}</Text>
                <Text style={[styles.fileName, { color: colors.textMuted }]}>{file.name}</Text>
              </View>
            </View>

            <View style={styles.fileActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
                onPress={() => handlePreview(file)}
              >
                <Text style={[styles.previewButtonText, { color: colors.primary }]}>{t('result_preview')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.successLight || '#E8FAF0' }]}
                onPress={() => handleDownload(file)}
              >
                <Text style={[styles.downloadButtonText, { color: colors.success }]}>{t('result_download')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warningLight || '#FFF3E0' }]}
                onPress={() => handleShare(file)}
              >
                <Text style={[styles.shareButtonText, { color: colors.warning || '#DD6B20' }]}>{t('result_share')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Generate New */}
      <TouchableOpacity style={[styles.newButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleNewGeneration}>
        <Text style={styles.newButtonText}>{t('result_generate_new')}</Text>
      </TouchableOpacity>

      {/* History Link */}
      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={[styles.historyText, { color: colors.primary }]}>{t('result_view_history')}</Text>
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
