/**
 * LanguagePicker Component
 *
 * Modal/dropdown for selecting the output language.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../utils/languageConfig';
import { useTheme } from '../utils/themeContext';

interface LanguagePickerProps {
  visible: boolean;
  selectedCode: string;
  onSelect: (language: LanguageOption) => void;
  onClose: () => void;
}

export default function LanguagePicker({
  visible,
  selectedCode,
  onSelect,
  onClose,
}: LanguagePickerProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>🌐 Select Language</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeBtn, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={SUPPORTED_LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: colors.border }, item.code === selectedCode && { backgroundColor: colors.primaryLight }]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.itemNative, { color: colors.textMuted }]}>{item.nativeName}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { fontSize: 20 },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemNative: { fontSize: 14 },
});
