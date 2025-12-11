import { db } from '@/config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export type SessionPayload = {
  uid: string;
  phonemeId: string;
  durationMs: number;
  storagePath: string;
  downloadUrl: string;
  sentenceId?: string;
  targetPhonemes?: string[];
  level?: number;
  createdAt?: string;
};

export async function saveSession(payload: SessionPayload) {
  const { uid, phonemeId, durationMs, storagePath, downloadUrl } = payload;
  const sessionId = `${Date.now()}`;
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);

  await setDoc(sessionRef, {
    phonemeId,
    durationMs,
    storagePath,
    downloadUrl,
    sentenceId: payload.sentenceId,
    targetPhonemes: payload.targetPhonemes,
    level: payload.level,
    createdAt: payload.createdAt ?? new Date().toISOString(),
  });

  return { sessionId };
}
