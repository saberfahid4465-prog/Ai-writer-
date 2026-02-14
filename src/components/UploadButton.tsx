/**
 * UploadButton Component
 *
 * A styled button that triggers the document picker
 * for file upload (PDF, Word, Excel, PPT, TXT).
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

interface UploadButtonProps {
  onFileSelected: (result: DocumentPicker.DocumentPickerResult) => void;
  selectedFileName?: string | null;
}

export default function UploadButton({ onFileSelected, selectedFileName }: UploadButtonProps) {
  const handlePress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        onFileSelected(result);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.icon}>📎</Text>
      <Text style={styles.text}>
        {selectedFileName ? `📄 ${selectedFileName}` : 'Upload a file (PDF, Word, Excel, PPT, TXT)'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    padding: 16,
  },
  icon: { fontSize: 20, marginRight: 10 },
  text: { fontSize: 14, color: '#666', flex: 1 },
});
