import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type { UploadResult } from '@/types/shared';

export type { UploadResult } from '@/types/shared';

// Type for React Native file objects that FormData accepts
interface RNFileObject {
  uri: string;
  name: string;
  type: string;
}

export function getMimeFromUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'm4a':
      return 'audio/m4a';
    case 'aac':
      return 'audio/aac';
    case 'caf':
      return 'audio/x-caf';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case '3gp':
      return 'audio/3gpp';
    default:
      // Reasonable defaults per platform
      return Platform.OS === 'ios' ? 'audio/m4a' : 'audio/3gpp';
  }
}

export function createFormData(uri: string): FormData {
  const type = getMimeFromUri(uri);
  const name = `recording.${type.split('/')[1] ?? 'm4a'}`;
  const file: RNFileObject = { uri, name, type };
  const form = new FormData();
  form.append('file', file as unknown as Blob);
  return form;
}

export async function uploadAudioWithTimeout(url: string, formData: FormData, timeoutMs = 6000): Promise<UploadResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    let data: Record<string, unknown> | undefined = undefined;
    try {
      data = await res.json();
    } catch (_) {
      // Non-JSON response
    }

    if (!res.ok || !data) {
      return { ok: false, status: res.status, json: data, error: 'Invalid server response' };
    }
    return { ok: true, status: res.status, json: data };
  } catch (e: unknown) {
    const error = e as { name?: string; message?: string };
    const msg = error?.name === 'AbortError' ? 'Request timed out' : (error?.message ?? 'Network error');
    return { ok: false, status: 0, error: msg };
  }
}

/**
 * Append optional metadata fields to FormData
 * Safely handles string/number conversions and ignores failures
 */
export function appendFormDataFields(
  form: FormData,
  fields: Record<string, string | number | undefined | null>
): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    try {
      form.append(key, String(value));
    } catch (_) {
      // Ignore if form append fails
    }
  }
}
