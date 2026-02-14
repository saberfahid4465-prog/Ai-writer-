/**
 * AI Writer — Smart Editor Screen
 *
 * Professional document editor with AI-powered tools:
 * - AI Improve / Expand / Shorten / Regenerate per section
 * - Move sections up/down, duplicate, delete
 * - Word count per section
 * - Preview mode (formatted read-only view)
 * - Edit mode (full editing)
 * - Auto-sync PDF/Word sections ↔ PPT slides
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { useTranslation } from '../i18n/i18nContext';
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
import { aiEditSection, SectionContent } from '../ai/sectionAIHelper';
import { SUPPORTED_LANGUAGES } from '../utils/languageConfig';
import { uint8ArrayToBase64 } from '../utils/base64Polyfill';
import * as FileSystem from 'expo-file-system';

// ─── Types ──────────────────────────────────────────────────────

interface EditorScreenProps {
  route: {
    params: {
      aiOutput: AIWriterOutput;
      topic: string;
      language: string;
      outputFormats?: string[];
      imageMap?: Map<string, DocumentImage>;
    };
  };
  navigation: any;
}

type ViewMode = 'edit' | 'preview';
type AIAction = 'improve' | 'expand' | 'shorten' | 'regenerate';

// ─── Component ──────────────────────────────────────────────────

export default function EditorScreen({ route, navigation }: EditorScreenProps) {
  const { aiOutput: initialOutput, topic, language, outputFormats: rawFormats } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const outputFormats = rawFormats || ['pdf', 'docx', 'pptx', 'xlsx'];

  // Defensive extraction of AI output with fallbacks
  const safePdfWord = initialOutput?.pdf_word || { title: topic || 'Untitled', author: 'AI Writer', language: language || 'English', sections: [] };
  const safePpt = initialOutput?.ppt || { slides: [] };
  const safeSections = Array.isArray(safePdfWord.sections) ? safePdfWord.sections : [];
  const safeSlides = Array.isArray(safePpt.slides) ? safePpt.slides : [];

  // Detect RTL language for proper text direction in editor
  const isRTL = useMemo(() => {
    return SUPPORTED_LANGUAGES.find(l => l.name === language)?.direction === 'rtl' || false;
  }, [language]);
  const rtlStyle = useMemo(
    () => isRTL ? { writingDirection: 'rtl' as const, textAlign: 'right' as const } : {},
    [isRTL]
  );

  // Core state - use safe defaults
  const [title, setTitle] = useState(typeof safePdfWord.title === 'string' ? safePdfWord.title : topic || 'Untitled');
  const [sections, setSections] = useState<PdfWordSection[]>(
    safeSections.map((s) => ({
      heading: typeof s?.heading === 'string' ? s.heading : 'Section',
      paragraph: typeof s?.paragraph === 'string' ? s.paragraph : '',
      bullets: Array.isArray(s?.bullets) ? [...s.bullets] : [],
      image_keyword: typeof s?.image_keyword === 'string' ? s.image_keyword : undefined,
    }))
  );
  const [slides, setSlides] = useState<PptSlide[]>(
    safeSlides.map((s) => ({
      title: typeof s?.title === 'string' ? s.title : 'Slide',
      bullets: Array.isArray(s?.bullets) ? [...s.bullets] : [],
      image_keyword: typeof s?.image_keyword === 'string' ? s.image_keyword : undefined,
    }))
  );

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [aiLoadingSection, setAiLoadingSection] = useState<number | null>(null);
  const [showAiMenu, setShowAiMenu] = useState<number | null>(null);

  // ─── Word Count ───────────────────────────────────────────
  const totalWordCount = useMemo(() => {
    let count = (title || '').split(/\s+/).filter(Boolean).length;
    for (const s of sections) {
      if (!s) continue;
      count += (s.heading || '').split(/\s+/).filter(Boolean).length;
      count += (s.paragraph || '').split(/\s+/).filter(Boolean).length;
      const bullets = Array.isArray(s.bullets) ? s.bullets : [];
      for (const b of bullets) {
        if (typeof b === 'string') {
          count += b.split(/\s+/).filter(Boolean).length;
        }
      }
    }
    return count;
  }, [title, sections]);

  const sectionWordCount = useCallback((s: PdfWordSection): number => {
    if (!s) return 0;
    let count = (s.heading || '').split(/\s+/).filter(Boolean).length;
    count += (s.paragraph || '').split(/\s+/).filter(Boolean).length;
    const bullets = Array.isArray(s.bullets) ? s.bullets : [];
    for (const b of bullets) {
      if (typeof b === 'string') {
        count += b.split(/\s+/).filter(Boolean).length;
      }
    }
    return count;
  }, []);

  // ─── Section Editing ─────────────────────────────────────
  const updateSection = useCallback((index: number, field: keyof PdfWordSection, value: string) => {
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      if (!updated[index]) return updated;
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
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
      if (!updated[sectionIndex]) return updated;
      const newBullets = Array.isArray(updated[sectionIndex].bullets) ? [...updated[sectionIndex].bullets] : [];
      newBullets[bulletIndex] = value;
      updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
      return updated;
    });
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      if (!updated[sectionIndex]) return updated;
      const newBullets = Array.isArray(updated[sectionIndex].bullets) ? [...updated[sectionIndex].bullets] : [];
      if (bulletIndex < newBullets.length) {
        newBullets[bulletIndex] = value;
        updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
      }
      return updated;
    });
  }, []);

  const addBullet = useCallback((sectionIndex: number) => {
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      if (!updated[sectionIndex]) return updated;
      const existingBullets = Array.isArray(updated[sectionIndex].bullets) ? updated[sectionIndex].bullets : [];
      updated[sectionIndex] = {
        ...updated[sectionIndex],
        bullets: [...existingBullets, ''],
      };
      return updated;
    });
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      if (!updated[sectionIndex]) return updated;
      const existingBullets = Array.isArray(updated[sectionIndex].bullets) ? updated[sectionIndex].bullets : [];
      updated[sectionIndex] = {
        ...updated[sectionIndex],
        bullets: [...existingBullets, ''],
      };
      return updated;
    });
  }, []);

  const removeBullet = useCallback((sectionIndex: number, bulletIndex: number) => {
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      if (!updated[sectionIndex]) return updated;
      const bullets = Array.isArray(updated[sectionIndex].bullets) ? updated[sectionIndex].bullets : [];
      const newBullets = bullets.filter((_: string, i: number) => i !== bulletIndex);
      updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
      return updated;
    });
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      if (!updated[sectionIndex]) return updated;
      const bullets = Array.isArray(updated[sectionIndex].bullets) ? updated[sectionIndex].bullets : [];
      const newBullets = bullets.filter((_: string, i: number) => i !== bulletIndex);
      updated[sectionIndex] = { ...updated[sectionIndex], bullets: newBullets };
      return updated;
    });
  }, []);

  // ─── Section Management ───────────────────────────────────
  const addSection = useCallback(() => {
    const newSection: PdfWordSection = {
      heading: t('editor_new_section_heading') || 'New Section',
      paragraph: t('editor_new_section_paragraph') || 'Add content here...',
      bullets: [t('editor_new_section_bullet') || 'Key point'],
      image_keyword: '',
    };
    setSections((prev: PdfWordSection[]) => [...prev, newSection]);
    setSlides((prev: PptSlide[]) => [
      ...prev,
      { title: t('editor_new_section_heading') || 'New Section', bullets: [t('editor_new_section_bullet') || 'Key point'], image_keyword: '' },
    ]);
    setExpandedSection(sections.length);
  }, [sections.length, t]);

  const removeSection = useCallback((index: number) => {
    if (sections.length <= 1) {
      Alert.alert(t('alert_cannot_remove_title') || 'Cannot Remove', t('alert_cannot_remove_msg') || 'At least one section is required.');
      return;
    }
    const sectionHeading = sections[index]?.heading || 'this section';
    Alert.alert(t('alert_delete_section_title') || 'Delete Section?', t('alert_delete_section_msg', { heading: sectionHeading }) || `Delete "${sectionHeading}"?`, [
      { text: t('alert_cancel') || 'Cancel', style: 'cancel' },
      {
        text: t('alert_delete') || 'Delete',
        style: 'destructive',
        onPress: () => {
          setSections((prev: PdfWordSection[]) => prev.filter((_: PdfWordSection, i: number) => i !== index));
          setSlides((prev: PptSlide[]) => prev.filter((_: PptSlide, i: number) => i !== index));
          setExpandedSection(null);
        },
      },
    ]);
  }, [sections, t]);

  const moveSection = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      if (updated[index] && updated[newIndex]) {
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      }
      return updated;
    });
    setExpandedSection(newIndex);
  }, [sections.length]);

  const duplicateSection = useCallback((index: number) => {
    const src = sections[index];
    if (!src) return;
    const srcBullets = Array.isArray(src.bullets) ? src.bullets : [];
    const copy: PdfWordSection = {
      heading: `${src.heading || 'Section'} ${t('editor_copy_suffix') || '(Copy)'}`,
      paragraph: src.paragraph || '',
      bullets: [...srcBullets],
      image_keyword: src.image_keyword,
    };
    setSections((prev: PdfWordSection[]) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });
    setSlides((prev: PptSlide[]) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, {
        title: copy.heading,
        bullets: [...srcBullets],
        image_keyword: copy.image_keyword,
      });
      return updated;
    });
    setExpandedSection(index + 1);
  }, [sections, t]);

  // ─── AI Section Actions ───────────────────────────────────
  const handleAIAction = useCallback(async (index: number, action: AIAction) => {
    const section = sections[index];
    if (!section) return;

    setShowAiMenu(null);
    setAiLoadingSection(index);
    try {
      const sectionData: SectionContent = {
        heading: section.heading || 'Section',
        paragraph: section.paragraph || '',
        bullets: Array.isArray(section.bullets) ? section.bullets : [],
      };

      const result = await aiEditSection(action, sectionData, language, title);

      setSections((prev: PdfWordSection[]) => {
        const updated = [...prev];
        if (!updated[index]) return updated;
        updated[index] = {
          ...updated[index],
          heading: result.heading || updated[index].heading,
          paragraph: result.paragraph || updated[index].paragraph,
          bullets: Array.isArray(result.bullets) ? result.bullets : updated[index].bullets,
        };
        return updated;
      });
      setSlides((prev: PptSlide[]) => {
        const updated = [...prev];
        if (!updated[index]) return updated;
        updated[index] = {
          ...updated[index],
          title: result.heading || updated[index].title,
          bullets: Array.isArray(result.bullets) ? result.bullets : updated[index].bullets,
        };
        return updated;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI operation failed.';
      Alert.alert(t('alert_ai_error_title') || 'AI Error', msg);
    } finally {
      setAiLoadingSection(null);
    }
  }, [sections, language, title, t]);

  // ─── Generate Files ───────────────────────────────────────
  const handleGenerateFiles = async () => {
    setIsGenerating(true);
    const files: GeneratedFile[] = [];
    try {
      // Filter sections: must have heading AND paragraph, then strip empty bullets
      const validSections = sections
        .map((s, idx) => ({ section: s, originalIndex: idx }))
        .filter(({ section: s }) => s.heading.trim() && s.paragraph.trim())
        .map(({ section: s, originalIndex }) => ({
          section: { ...s, bullets: s.bullets.filter((b) => b.trim()) },
          originalIndex,
        }))
        .map(({ section: s, originalIndex }) => ({
          section: s.bullets.length === 0 ? { ...s, bullets: [s.heading] } : s,
          originalIndex,
        }));

      if (validSections.length === 0) {
        Alert.alert(t('alert_error'), t('alert_no_valid_sections') || 'No sections with content found. Please add at least one section with a heading and paragraph.');
        setIsGenerating(false);
        return;
      }

      // Build matching slides from valid sections only
      const validSlides = validSections.map(({ section: s, originalIndex }) => {
        const matchingSlide = slides[originalIndex] || { title: s.heading, bullets: s.bullets, image_keyword: s.image_keyword };
        // Defensive check: ensure bullets is an array
        const slideBullets = Array.isArray(matchingSlide.bullets) ? matchingSlide.bullets : [];
        const filteredBullets = slideBullets.filter((b) => typeof b === 'string' && b.trim());
        return {
          ...matchingSlide,
          title: typeof matchingSlide.title === 'string' ? matchingSlide.title : s.heading,
          bullets: filteredBullets.length > 0 ? filteredBullets : [s.heading],
        };
      });

      const sectionData = validSections.map(({ section }) => section);

      const editedOutput: AIWriterOutput = {
        pdf_word: {
          title,
          author: 'AI Writer',
          language,
          sections: sectionData,
        },
        ppt: {
          slides: validSlides,
        },
        excel: {
          headers: ['Section', 'Key Points', 'Image Keyword'],
          rows: sectionData.map((s) => [
            s.heading,
            s.bullets.join('; '),
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

      // GEN-48-W7 fix: Cap total image data to prevent OOM on low-RAM devices
      const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB cap
      let totalImageBytes = 0;
      for (const [, img] of imageMap) {
        totalImageBytes += img.imageBytes.length;
      }
      if (totalImageBytes > MAX_IMAGE_BYTES) {
        console.warn(`Image data ${(totalImageBytes / 1024 / 1024).toFixed(1)}MB exceeds cap, stripping images`);
        imageMap = new Map();
      }

      // Generate all selected formats in parallel using allSettled
      // GEN-19-W2 fix: allSettled waits for ALL to finish, preventing orphaned files
      setGeneratingStatus(t('editor_generating_formats'));

      type FormatResult = { file: GeneratedFile };
      const formatLabels: Record<string, string> = { pdf: 'PDF', docx: 'Word', pptx: 'PPT', xlsx: 'Excel' };
      const filePromises: { type: string; promise: Promise<FormatResult> }[] = [];

      if (outputFormats.includes('pdf')) {
        filePromises.push({ type: 'pdf', promise: (async () => {
          setGeneratingStatus(`📕 ${t('editor_generating_format', { format: 'PDF' })}`);
          const pdfBytes = await generatePDF(editedOutput.pdf_word, imageMap);
          const pdfFileName = generateFileName(topic, 'pdf');
          const pdfBase64 = bufferToBase64(pdfBytes);
          const pdfPath = await saveFile(pdfFileName, pdfBase64);
          return { file: { name: pdfFileName, path: pdfPath, type: 'pdf' as const } };
        })() });
      }

      if (outputFormats.includes('docx')) {
        filePromises.push({ type: 'docx', promise: (async () => {
          setGeneratingStatus(`📘 ${t('editor_generating_format', { format: 'Word' })}`);
          const wordBase64 = await generateWord(editedOutput.pdf_word, imageMap);
          const wordFileName = generateFileName(topic, 'docx');
          const wordPath = await saveFile(wordFileName, wordBase64);
          return { file: { name: wordFileName, path: wordPath, type: 'docx' as const } };
        })() });
      }

      if (outputFormats.includes('pptx')) {
        filePromises.push({ type: 'pptx', promise: (async () => {
          setGeneratingStatus(`📙 ${t('editor_generating_format', { format: 'PPT' })}`);
          const pptBase64 = await generatePPT(editedOutput.ppt, editedOutput.pdf_word, imageMap);
          const pptFileName = generateFileName(topic, 'pptx');
          const pptPath = await saveFile(pptFileName, pptBase64);
          return { file: { name: pptFileName, path: pptPath, type: 'pptx' as const } };
        })() });
      }

      if (outputFormats.includes('xlsx')) {
        filePromises.push({ type: 'xlsx', promise: (async () => {
          setGeneratingStatus(`📗 ${t('editor_generating_format', { format: 'Excel' })}`);
          const excelBase64 = await generateExcel(editedOutput.excel, editedOutput.pdf_word, imageMap);
          const excelFileName = generateFileName(topic, 'xlsx');
          const excelPath = await saveFile(excelFileName, excelBase64);
          return { file: { name: excelFileName, path: excelPath, type: 'xlsx' as const } };
        })() });
      }

      // Helper function to mimic Promise.allSettled for Hermes compatibility
      const allSettled = <T,>(promises: Promise<T>[]): Promise<Array<{status: 'fulfilled'; value: T} | {status: 'rejected'; reason: any}>> => {
        return Promise.all(
          promises.map(p =>
            p
              .then(value => ({ status: 'fulfilled' as const, value }))
              .catch(reason => ({ status: 'rejected' as const, reason }))
          )
        );
      };

      const results = await allSettled(filePromises.map(fp => fp.promise));

      // Collect successes and failures
      const errors: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          files.push(result.value.file);
        } else {
          const label = formatLabels[filePromises[i].type] || filePromises[i].type;
          errors.push(`${label}: ${result.reason?.message || 'Unknown error'}`);
        }
      }

      // If ALL failed, treat as full failure
      if (files.length === 0) {
        throw new Error(errors.join('\n'));
      }

      // If some failed but others succeeded, warn + continue with partial
      if (errors.length > 0) {
        console.warn('Partial generation failures:', errors);
      }

      // GEN-18-W1 fix: Sort files in consistent order (PDF → Word → PPT → Excel)
      const FORMAT_ORDER: Record<string, number> = { pdf: 0, docx: 1, pptx: 2, xlsx: 3 };
      files.sort((a, b) => (FORMAT_ORDER[a.type] ?? 9) - (FORMAT_ORDER[b.type] ?? 9));

      setGeneratingStatus(t('editor_generating_saving'));

      await addHistoryEntry({
        id: generateId(),
        topic: `${topic} (Edited)`,
        language,
        createdAt: new Date().toISOString(),
        files,
      });

      navigation.replace('Result', { topic, language, files });
    } catch (error) {
      // Clean up ALL partial files that were saved (allSettled ensures none are still running)
      for (const f of files) {
        try { await FileSystem.deleteAsync(f.path, { idempotent: true }); } catch { /* ignore */ }
      }
      const message = error instanceof Error ? error.message : t('alert_unexpected_error');
      Alert.alert(t('alert_generation_failed_title'), message);
    } finally {
      setIsGenerating(false);
      setGeneratingStatus('');
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Top Bar */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>{t('editor_back')}</Text>
          </TouchableOpacity>

          {/* View Mode Toggle */}
          <View style={[styles.modeToggle, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.modeBtn, viewMode === 'edit' && { backgroundColor: colors.primary }]}
              onPress={() => setViewMode('edit')}
            >
              <Text style={[styles.modeBtnText, { color: viewMode === 'edit' ? '#FFF' : colors.textMuted }]}>
                {t('editor_edit_mode')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, viewMode === 'preview' && { backgroundColor: colors.primary }]}
              onPress={() => setViewMode('preview')}
            >
              <Text style={[styles.modeBtnText, { color: viewMode === 'preview' ? '#FFF' : colors.textMuted }]}>
                {t('editor_preview_mode')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.skipBtn, { backgroundColor: colors.primaryLight }]}
            onPress={handleGenerateFiles}
            disabled={isGenerating}
          >
            <Text style={[styles.skipText, { color: colors.primary }]}>
              {isGenerating ? '...' : t('editor_skip')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>✏️</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {viewMode === 'edit' ? t('editor_edit_title') : t('editor_preview_title')}
          </Text>
          <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statText, { color: colors.textMuted }]}>
              {t('editor_stats', { words: String(totalWordCount), sections: String(sections.length), language })}
            </Text>
          </View>
        </View>

        {/* ─── PREVIEW MODE ──────────────────────────────── */}
        {viewMode === 'preview' ? (
          <View>
            <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.previewTitle, { color: colors.textPrimary }, rtlStyle]}>{title}</Text>
              <Text style={[styles.previewMeta, { color: colors.textMuted }]}>
                {t('editor_preview_meta', { language })}
              </Text>
            </View>

            {sections.map((section, sIndex) => (
              <View key={sIndex} style={[styles.previewSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.previewHeading, { color: colors.primary }, rtlStyle]}>
                  {sIndex + 1}. {section.heading}
                </Text>
                <Text style={[styles.previewParagraph, { color: colors.textPrimary }, rtlStyle]}>
                  {section.paragraph}
                </Text>
                {section.bullets.map((bullet, bIndex) => (
                  <View key={bIndex} style={styles.previewBulletRow}>
                    <Text style={[styles.previewBulletDot, { color: colors.primary }]}>•</Text>
                    <Text style={[styles.previewBulletText, { color: colors.textSecondary }, rtlStyle]}>
                      {bullet}
                    </Text>
                  </View>
                ))}
                <Text style={[styles.previewWordCount, { color: colors.textMuted }]}>
                  {t('editor_word_count', { n: String(sectionWordCount(section)) })}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          /* ─── EDIT MODE ────────────────────────────────── */
          <View>
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('editor_document_title_label')}</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                  ...rtlStyle,
                }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('editor_document_title_placeholder')}
                placeholderTextColor={colors.placeholder}
                maxFontSizeMultiplier={1.3}
              />
            </View>

            {/* Sections */}
            {sections.map((section, sIndex) => {
              if (!section) return null;
              // Safe property access for render
              const secHeading = typeof section.heading === 'string' ? section.heading : '';
              const secParagraph = typeof section.paragraph === 'string' ? section.paragraph : '';
              const secBullets = Array.isArray(section.bullets) ? section.bullets : [];

              const isExpanded = expandedSection === sIndex;
              const isAiLoading = aiLoadingSection === sIndex;
              return (
                <View
                  key={sIndex}
                  style={[
                    styles.sectionCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isAiLoading && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
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
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.sectionTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {secHeading || t('editor_untitled_section')}
                        </Text>
                        <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>
                          {t('editor_section_meta', { n: String(sectionWordCount(section)), m: String(secBullets.length) })}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.expandIcon, { color: colors.textMuted }]}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* AI Loading Overlay */}
                  {isAiLoading && (
                    <View style={[styles.aiLoadingBar, { backgroundColor: colors.primaryLight }]}>
                      <ActivityIndicator color={colors.primary} size="small" />
                      <Text style={[styles.aiLoadingText, { color: colors.primary }]}>
                        {t('editor_ai_working')}
                      </Text>
                    </View>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && !isAiLoading && (
                    <View style={styles.sectionBody}>
                      {/* AI Tools Bar */}
                      <View style={[styles.aiToolsBar, { borderBottomColor: colors.borderLight }]}>
                        <Text style={[styles.aiToolsLabel, { color: colors.textMuted }]}>{t('editor_ai_tools_label')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <TouchableOpacity
                            style={[styles.aiBtn, { backgroundColor: colors.successLight }]}
                            onPress={() => handleAIAction(sIndex, 'improve')}
                          >
                            <Text style={[styles.aiBtnText, { color: colors.success }]}>{t('editor_ai_improve')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.aiBtn, { backgroundColor: colors.primaryLight }]}
                            onPress={() => handleAIAction(sIndex, 'expand')}
                          >
                            <Text style={[styles.aiBtnText, { color: colors.primary }]}>{t('editor_ai_expand')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.aiBtn, { backgroundColor: colors.warningLight }]}
                            onPress={() => handleAIAction(sIndex, 'shorten')}
                          >
                            <Text style={[styles.aiBtnText, { color: colors.warning }]}>{t('editor_ai_shorten')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.aiBtn, { backgroundColor: colors.dangerLight }]}
                            onPress={() => handleAIAction(sIndex, 'regenerate')}
                          >
                            <Text style={[styles.aiBtnText, { color: colors.danger }]}>{t('editor_ai_regenerate')}</Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </View>

                      {/* Section Management */}
                      <View style={styles.managementBar}>
                        <TouchableOpacity
                          style={[styles.mgmtBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => moveSection(sIndex, 'up')}
                          disabled={sIndex === 0}
                        >
                          <Text style={[styles.mgmtBtnText, { color: sIndex === 0 ? colors.textMuted : colors.textPrimary }]}>↑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.mgmtBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => moveSection(sIndex, 'down')}
                          disabled={sIndex === sections.length - 1}
                        >
                          <Text style={[styles.mgmtBtnText, { color: sIndex === sections.length - 1 ? colors.textMuted : colors.textPrimary }]}>↓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.mgmtBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => duplicateSection(sIndex)}
                        >
                          <Text style={[styles.mgmtBtnText, { color: colors.textPrimary }]}>{t('editor_copy_section')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.mgmtBtn, { backgroundColor: colors.dangerLight }]}
                          onPress={() => removeSection(sIndex)}
                        >
                          <Text style={[styles.mgmtBtnText, { color: colors.danger }]}>{t('editor_delete_section')}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Heading */}
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('editor_heading_label')}</Text>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                          ...rtlStyle,
                        }]}
                        value={secHeading}
                        onChangeText={(v) => updateSection(sIndex, 'heading', v)}
                        placeholder={t('editor_heading_placeholder')}
                        placeholderTextColor={colors.placeholder}
                        maxFontSizeMultiplier={1.3}
                      />

                      {/* Paragraph */}
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('editor_content_label')}</Text>
                      <TextInput
                        style={[styles.textArea, {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                          ...rtlStyle,
                        }]}
                        value={secParagraph}
                        onChangeText={(v) => updateSection(sIndex, 'paragraph', v)}
                        placeholder={t('editor_content_placeholder')}
                        placeholderTextColor={colors.placeholder}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        maxFontSizeMultiplier={1.3}
                      />

                      {/* Bullets */}
                      <View style={styles.bulletsHeader}>
                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                          {t('editor_key_points_label', { n: String(secBullets.length) })}
                        </Text>
                        <TouchableOpacity
                          style={[styles.addBulletBtn, { backgroundColor: colors.primaryLight }]}
                          onPress={() => addBullet(sIndex)}
                        >
                          <Text style={[styles.addBulletText, { color: colors.primary }]}>{t('editor_add_bullet')}</Text>
                        </TouchableOpacity>
                      </View>

                      {secBullets.map((bullet, bIndex) => (
                        <View key={bIndex} style={styles.bulletRow}>
                          <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                          <TextInput
                            style={[styles.bulletInput, {
                              backgroundColor: colors.inputBackground,
                              borderColor: colors.inputBorder,
                              color: colors.inputText,
                              ...rtlStyle,
                            }]}
                            value={typeof bullet === 'string' ? bullet : ''}
                            onChangeText={(v) => updateBullet(sIndex, bIndex, v)}
                            placeholder={t('editor_bullet_placeholder')}
                            placeholderTextColor={colors.placeholder}
                            maxFontSizeMultiplier={1.3}
                          />
                          {secBullets.length > 1 && (
                            <TouchableOpacity
                              style={styles.removeBulletBtn}
                              onPress={() => removeBullet(sIndex, bIndex)}
                            >
                              <Text style={[styles.removeBulletText, { color: colors.danger }]}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}

                      {/* Image Keyword */}
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                        {t('editor_image_keyword_label')}
                      </Text>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: colors.inputBackground,
                          borderColor: colors.inputBorder,
                          color: colors.inputText,
                          ...rtlStyle,
                        }]}
                        value={section.image_keyword || ''}
                        onChangeText={(v) => updateSection(sIndex, 'image_keyword', v)}
                        placeholder={t('editor_image_keyword_placeholder')}
                        placeholderTextColor={colors.placeholder}
                        maxFontSizeMultiplier={1.3}
                      />
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
              <Text style={[styles.addSectionText, { color: colors.primary }]}>{t('editor_add_section')}</Text>
            </TouchableOpacity>
          </View>
        )}

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
              <Text style={styles.generateText}>{generatingStatus || t('editor_generating')}</Text>
            </View>
          ) : (
            <Text style={styles.generateText}>{t('editor_generate_final')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Utilities ──────────────────────────────────────────────────

function bufferToBase64(buffer: Uint8Array): string {
  return uint8ArrayToBase64(buffer);
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 50, paddingBottom: 40 },

  // Top bar
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backText: { fontSize: 16, fontWeight: '600' },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  skipText: { fontSize: 12, fontWeight: '600' },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  modeBtnText: { fontSize: 12, fontWeight: '600' },

  // Header
  header: { alignItems: 'center', marginBottom: 16 },
  headerIcon: { fontSize: 36, marginBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  statsRow: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statText: { fontSize: 12 },

  // Fields
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
    minHeight: 120,
  },

  // Section Card
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
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  sectionMeta: { fontSize: 11, marginTop: 2 },
  expandIcon: { fontSize: 12, marginLeft: 8 },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14 },

  // AI Loading
  aiLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  aiLoadingText: { fontSize: 13, fontWeight: '600' },

  // AI Tools
  aiToolsBar: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  aiToolsLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  aiBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  aiBtnText: { fontSize: 12, fontWeight: '600' },

  // Section Management
  managementBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  mgmtBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  mgmtBtnText: { fontSize: 12, fontWeight: '600' },

  // Bullets
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

  // Add Section
  addSectionBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addSectionText: { fontSize: 15, fontWeight: '600' },

  // Generate
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

  // Preview Mode
  previewCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
  },
  previewTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  previewMeta: { fontSize: 13 },
  previewSection: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  previewHeading: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  previewParagraph: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  previewBulletRow: { flexDirection: 'row', marginBottom: 4, paddingRight: 10 },
  previewBulletDot: { fontSize: 16, marginRight: 8, width: 14 },
  previewBulletText: { fontSize: 13, lineHeight: 20, flex: 1 },
  previewWordCount: { fontSize: 11, textAlign: 'right', marginTop: 8 },
});
