/**
 * AI Writer — File Storage Utility
 *
 * Handles saving, listing, and managing generated files
 * using expo-file-system and AsyncStorage.
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ──────────────────────────────────────────────────

const OUTPUT_DIR = `${FileSystem.documentDirectory}ai-writer-output/`;
const HISTORY_KEY = '@ai_writer_history';

// ─── Types ──────────────────────────────────────────────────────

export interface GeneratedFile {
  name: string;
  path: string;
  type: 'pdf' | 'docx' | 'pptx' | 'xlsx';
  size?: number;
}

export interface HistoryEntry {
  id: string;
  topic: string;
  language: string;
  createdAt: string; // ISO date string
  files: GeneratedFile[];
}

// ─── Directory Setup ────────────────────────────────────────────

/**
 * Ensure the output directory exists.
 */
export async function ensureOutputDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(OUTPUT_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(OUTPUT_DIR, { intermediates: true });
  }
}

// ─── File Operations ────────────────────────────────────────────

/**
 * Sanitize a topic string into a valid file name component.
 */
export function sanitizeTopic(topic: string): string {
  // Keep alphanumeric, Unicode letters, and spaces; fallback to 'ai_writer_doc'
  let sanitized = topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
  if (!sanitized || sanitized === '_') {
    sanitized = 'ai_writer_doc';
  }
  return sanitized;
}

/**
 * Generate a timestamped file name.
 */
export function generateFileName(topic: string, extension: string): string {
  const sanitized = sanitizeTopic(topic);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .substring(0, 14);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${sanitized}_${timestamp}_${rand}.${extension}`;
}

/**
 * Save file bytes to the output directory.
 *
 * @param fileName - The file name (e.g., "my_topic_20260214.pdf")
 * @param data - Base64-encoded file data
 * @returns Full file path
 */
export async function saveFile(fileName: string, data: string): Promise<string> {
  await ensureOutputDirectory();
  const filePath = `${OUTPUT_DIR}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return filePath;
}

/**
 * Delete a file from the output directory.
 */
export async function deleteFile(filePath: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists) {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
  }
}

// ─── History Management ─────────────────────────────────────────

/**
 * Load generation history from storage.
 */
export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (raw) {
      return JSON.parse(raw) as HistoryEntry[];
    }
  } catch (error) {
    console.warn('Failed to load history:', error);
  }
  return [];
}

/**
 * Save a new history entry.
 */
export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const history = await loadHistory();
  history.unshift(entry); // Add to front (newest first)

  // Keep only the last 50 entries; delete files for trimmed entries
  const trimmed = history.slice(0, 50);
  const removed = history.slice(50);
  for (const old of removed) {
    for (const file of old.files) {
      try {
        await deleteFile(file.path);
      } catch { /* ignore cleanup errors */ }
    }
  }

  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

/**
 * Delete a history entry and its associated files.
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await loadHistory();
  const entry = history.find((h) => h.id === id);

  if (entry) {
    // Delete all associated files
    for (const file of entry.files) {
      await deleteFile(file.path);
    }
  }

  const filtered = history.filter((h) => h.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

/**
 * Clear all history and files.
 */
export async function clearAllHistory(): Promise<void> {
  const history = await loadHistory();
  for (const entry of history) {
    for (const file of entry.files) {
      await deleteFile(file.path);
    }
  }
  await AsyncStorage.removeItem(HISTORY_KEY);
}

/**
 * Generate a unique ID for a history entry.
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
