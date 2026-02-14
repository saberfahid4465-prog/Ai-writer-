/**
 * AI Writer — Editor Screen
 *
 * Allows users to edit AI-generated content before final file generation.
 * Users can modify titles, headings, paragraphs, and bullet points.
 * After editing, generates all file formats with the customized content.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../utils/themeContext';
import { AIWriterOutput, PdfWordSection, PptSlide } from '../ai/responseParser';
import { generatePDF } from '../generators/pdfGenerator';
import { generateWord } from '../generators/wordGenerator';
import { generatePPT } from '../generators/pptGenerator';
import { generateExcel } from '../generators/excelGenerator';
import {
  saveFile,
  generateFileName,
  addHistoryEntry,
  generateId,
  GeneratedFile,
} from '../utils/fileStorage';
import {
  fetchImagesForKeywords,
  extractImageKeywords,
  clearImageCache,
  DocumentImage,
} from '../services/pexelsService';

// ─── Types ──────────────────────────────────────────────────────

interface EditorScreenProps {
  route: {
    params: {
      aiOutput: AIWriterOutput;
      topic: string;
      language: string;
      imageMap?: Map<string, DocumentImage>;
    };
  };
  navigation: any;
}

// ─── Component ──────────────────────────────────────────────────

export default function EditorScreen({ route, navigation }: EditorScreenProps) {
  const { aiOutput: initialOutput, topic, language } = route.params;
  const { colors } = useTheme();

  // Editable state for PDF/Word sections
  const [title, setTitle] = useState(initialOutput.pdf_word.title);
  const [sections, setSections] = useState<PdfWordSection[]>(
    initialOutput.pdf_word.sections.map((s) => ({ ...s, bullets: [...s.bullets] }))
  );

  // PPT slides (synced from sections)
  const [slides, setSlides] = useState<PptSlide[]>(
    initialOutput.ppt.slides.map((s) => ({ ...s, bullets: [...s.bullets] }))
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  // ─── Section Editing ─────────────────────────────────────
  const updateSection = useCallback((index: number, field: keyof PdfWordSection, value: string) => {
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    // Sync to slides
    if (field === 'heading') {
      setSlides((prev: PptSlide[]) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], title: value };
        }
        return updated;
      });
    }
  }, []);

  const updateBullet = useCallback((sectionIndex: number, bulletIndex: number, value: string) => {
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      const newBullets = [...updated[sectionIndex].bullets];
      newBullets[bulletIndex] = value;
      updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
      return updated;
    });
    // Sync to slides
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      if (updated[sectionIndex]) {
        const newBullets = [...updated[sectionIndex].bullets];
        if (bulletIndex < newBullets.length) {
          newBullets[bulletIndex] = value;
          updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
        }
      }
      return updated;
    });
  }, []);

  const addBullet = useCallback((sectionIndex: number) => {
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      updated[sectionIndex] = {
        ...updated[sectionIndex],
        bullets: [...updated[sectionIndex].bullets, ''],
      };
      return updated;
    });
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      if (updated[sectionIndex]) {
        updated[sectionIndex] = {
          ...updated[sectionIndex],
          bullets: [...updated[sectionIndex].bullets, ''],
        };
      }
      return updated;
    });
  }, []);

  const removeBullet = useCallback((sectionIndex: number, bulletIndex: number) => {
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      const newBullets = updated[sectionIndex].bullets.filter((_: string, i: number) => i !== bulletIndex);
      updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
      return updated;
    });
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      if (updated[sectionIndex]) {
        const newBullets = updated[sectionIndex].bullets.filter((_: string, i: number) => i !== bulletIndex);
        updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
      }
      return updated;
    });
  }, []);

  const addSection = useCallback(() => {
    const newSection: PdfWordSection = {
      heading: 'New Section',
      paragraph: 'Enter your content here.',
      bullets: ['Point 1'],
      image_keyword: '',
    };
    setSections((prev: PdfWordSection[]) => [...prev, newSection]);
    setSlides((prev: PptSlide[]) => [
      ...prev,
      { title: 'New Section', bullets: ['Point 1'], image_keyword: '' },
    ]);
    setExpandedSection(sections.length);
  }, [sections.length]);

  const removeSection = useCallback((index: number) => {
    if (sections.length <= 1) {
      Alert.alert('Cannot Remove', 'You need at least one section.');
      return;
    }
    Alert.alert('Remove Section', `Delete "${sections[index].heading}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSections((prev: PdfWordSection[]) => prev.filter((_: PdfWordSection, i: number) => i !== index));
          setSlides((prev: PptSlide[]) => prev.filter((_: PptSlide, i: number) => i !== index));
          setExpandedSection(null);
        },
      },
    ]);
  }, [sections]);

  // ─── Generate Files ───────────────────────────────────────
  const handleGenerateFiles = async () => {
    setIsGenerating(true);
    try {
      // Build the edited output
      const editedOutput: AIWriterOutput = {
        pdf_word: {
          title,
          author: 'AI Writer',
          language,
          sections: sections.filter((s) => s.heading.trim() && s.paragraph.trim()),
        },
        ppt: {
          slides: slides.filter((s) => s.title.trim()),
        },
        excel: {
          headers: ['Section', 'Key Points', 'Image Keyword'],
          rows: sections
            .filter((s) => s.heading.trim())
            .map((s) => [
              s.heading,
              s.bullets.filter((b) => b.trim()).join('; '),
              s.image_keyword || '',
            ]),
        },
      };

      // Fetch images
      clearImageCache();
      const imageKeywords = extractImageKeywords(
        editedOutput.pdf_word.sections,
        editedOutput.ppt.slides
      );
      let imageMap = new Map<string, DocumentImage>();
      if (imageKeywords.length > 0) {
        try {
          imageMap = await fetchImagesForKeywords(imageKeywords);
        } catch (e) {
          console.warn('Image fetch failed:', e);
        }
      }

      // Generate files
      const pdfBytes = await generatePDF(editedOutput.pdf_word, imageMap);
      const pdfFileName = generateFileName(topic, 'pdf');
      const pdfBase64 = bufferToBase64(pdfBytes);
      const pdfPath = await saveFile(pdfFileName, pdfBase64);

      const wordBuffer = await generateWord(editedOutput.pdf_word, imageMap);
      const wordFileName = generateFileName(topic, 'docx');
      const wordBase64 = wordBuffer.toString('base64');
      const wordPath = await saveFile(wordFileName, wordBase64);

      const pptBase64 = await generatePPT(editedOutput.ppt, editedOutput.pdf_word, imageMap);
      const pptFileName = generateFileName(topic, 'pptx');
      const pptPath = await saveFile(pptFileName, pptBase64);

      const excelBuffer = await generateExcel(editedOutput.excel, editedOutput.pdf_word, imageMap);
      const excelFileName = generateFileName(topic, 'xlsx');
      const excelBase64 = excelBuffer.toString('base64');
      const excelPath = await saveFile(excelFileName, excelBase64);

      const files: GeneratedFile[] = [
        { name: pdfFileName, path: pdfPath, type: 'pdf' },
        { name: wordFileName, path: wordPath, type: 'docx' },
        { name: pptFileName, path: pptPath, type: 'pptx' },
        { name: excelFileName, path: excelPath, type: 'xlsx' },
      ];

      await addHistoryEntry({
        id: generateId(),
        topic: `${topic} (Edited)`,
        language,
        createdAt: new Date().toISOString(),
        files,
      });

      navigation.replace('Result', { topic, language, files });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      Alert.alert('Generation Failed', message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.skipBtn, { backgroundColor: colors.primaryLight }]}
            onPress={handleGenerateFiles}
            disabled={isGenerating}
          >
            <Text style={[styles.skipText, { color: colors.primary }]}>
              {isGenerating ? 'Generating...' : 'Skip Editing →'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.headerIcon}>✏️</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Content</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Customize your documents before generating files
          </Text>
        </View>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Document Title</Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
              color: colors.inputText,
            }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Document title..."
            placeholderTextColor={colors.placeholder}
          />
        </View>

        {/* Sections */}
        {sections.map((section, sIndex) => {
          const isExpanded = expandedSection === sIndex;
          return (
            <View
              key={sIndex}
              style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* Section Header */}
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setExpandedSection(isExpanded ? null : sIndex)}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Text style={[styles.sectionNumber, { color: colors.primary }]}>
                    §{sIndex + 1}
                  </Text>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {section.heading || 'Untitled Section'}
                  </Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <TouchableOpacity
                    style={[styles.deleteBtn, { backgroundColor: colors.dangerLight }]}
                    onPress={() => removeSection(sIndex)}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.danger }]}>🗑</Text>
                  </TouchableOpacity>
                  <Text style={[styles.expandIcon, { color: colors.textMuted }]}>
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Expanded Editing */}
              {isExpanded && (
                <View style={styles.sectionBody}>
                  {/* Heading */}
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Heading</Text>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.inputText,
                    }]}
                    value={section.heading}
                    onChangeText={(v) => updateSection(sIndex, 'heading', v)}
                    placeholder="Section heading..."
                    placeholderTextColor={colors.placeholder}
                  />

                  {/* Paragraph */}
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Paragraph</Text>
                  <TextInput
                    style={[styles.textArea, {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.inputBorder,
                      color: colors.inputText,
                    }]}
                    value={section.paragraph}
                    onChangeText={(v) => updateSection(sIndex, 'paragraph', v)}
                    placeholder="Section content..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  {/* Bullets */}
                  <View style={styles.bulletsHeader}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Key Points ({section.bullets.length})
                    </Text>
                    <TouchableOpacity
                      style={[styles.addBulletBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => addBullet(sIndex)}
                    >
                      <Text style={[styles.addBulletText, { color: colors.primary }]}>+ Add</Text>
                    </TouchableOpacity>
                  </View>

                  {section.bullets.map((bullet, bIndex) => (
                    <View key={bIndex} style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                      <TextInput
                        style={[styles.bulletInput, {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                        }]}
                        value={bullet}
                        onChangeText={(v) => updateBullet(sIndex, bIndex, v)}
                        placeholder="Key point..."
                        placeholderTextColor={colors.placeholder}
                      />
                      {section.bullets.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeBulletBtn}
                          onPress={() => removeBullet(sIndex, bIndex)}
                        >
                          <Text style={[styles.removeBulletText, { color: colors.danger }]}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Add Section */}
        <TouchableOpacity
          style={[styles.addSectionBtn, { borderColor: colors.primary }]}
          onPress={addSection}
        >
          <Text style={[styles.addSectionText, { color: colors.primary }]}>+ Add New Section</Text>
        </TouchableOpacity>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, {
            backgroundColor: colors.headerBg,
            shadowColor: colors.shadowColor,
            opacity: isGenerating ? 0.7 : 1,
          }]}
          onPress={handleGenerateFiles}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.generateText}> Generating Files...</Text>
            </View>
          ) : (
            <Text style={styles.generateText}>✨ Generate Final Files</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Utilities ──────────────────────────────────────────────────

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backText: { fontSize: 16, fontWeight: '600' },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  skipText: { fontSize: 13, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 20 },
  headerIcon: { fontSize: 40, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, textAlign: 'center' },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionNumber: { fontSize: 16, fontWeight: '700', marginRight: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 14 },
  expandIcon: { fontSize: 12 },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14 },
  bulletsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addBulletBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  addBulletText: { fontSize: 12, fontWeight: '600' },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletDot: { fontSize: 18, marginRight: 8, width: 14 },
  bulletInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
  },
  removeBulletBtn: { marginLeft: 8, padding: 4 },
  removeBulletText: { fontSize: 16, fontWeight: '600' },
  addSectionBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addSectionText: { fontSize: 15, fontWeight: '600' },
  generateButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generatingRow: { flexDirection: 'row', alignItems: 'center' },
  generateText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});
