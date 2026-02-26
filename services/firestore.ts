import { db } from '@/config/firebaseConfig';
import {
    doc,
    setDoc
} from 'firebase/firestore';

export type ExerciseAttemptPayload = {
  uid: string;
  exerciseType: 'turtle' | 'snake' | 'balloon' | 'onetap';
  gamePass: boolean;
  clinicalPass: boolean;
  confidence: number;
  feedback: string;
  metrics: Record<string, number | boolean>;
  createdAt?: string;
};

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
