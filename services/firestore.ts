import { db } from '@/config/firebaseConfig';
import {
    doc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import type { ExerciseAttemptPayload } from '@/types/shared';

export type { ExerciseAttemptPayload } from '@/types/shared';

/**
 * Saves a detailed log of an exercise attempt to users/{uid}/activity_logs
 * This is used by analysis services to persist AI results.
 */
export async function saveExerciseAttempt(payload: ExerciseAttemptPayload) {
  const { uid, exerciseType } = payload;
  const attemptId = `${Date.now()}`;
  const attemptRef = doc(db, 'users', uid, 'activity_logs', attemptId);

  await setDoc(attemptRef, {
    exerciseType,
    gamePass: payload.gamePass,
    clinicalPass: payload.clinicalPass,
    confidence: payload.confidence,
    feedback: payload.feedback,
    metrics: payload.metrics,
    createdAt: payload.createdAt ?? new Date().toISOString(),
  });

  return { attemptId };
}

/**
 * Save a practice session record for progress tracking
 * Used by all games to log individual attempts
 * Supports both 'tapping' (current) and 'onetap' (legacy) for backward compatibility
 */
export async function savePracticeSession(
  uid: string,
  gameId: 'snake' | 'turtle' | 'balloon' | 'tapping' | 'onetap',
  sessionData: Record<string, any>
): Promise<void> {
  const sessionsRef = collection(db, `users/${uid}/practice_sessions`);
  await addDoc(sessionsRef, {
    gameId,
    timestamp: serverTimestamp(),
    ...sessionData,
  });
}
