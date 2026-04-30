/**
 * Shared Type Definitions - Analysis & Clinical
 * 
 * Common types used across multiple games and services.
 * These are the canonical sources for shared data structures.
 */

/**
 * Firebase error type (Firebase SDK doesn't export this, but errors have these properties)
 * Used for type-safe error handling in auth operations
 */
export interface FirebaseError extends Error {
  code?: string;
  message: string;
}

/**
 * Unified analysis result format returned by clinical logic normalizers
 * Used as base type for all game-specific analysis results
 */
export interface UnifiedResult {
  game_pass: boolean;
  clinical_pass: boolean;
  feedback: string;
  confidence: number;
  metrics: Record<string, number | boolean>;
}

/**
 * Backend response from Flask /analyze/turtle endpoint
 */
export interface TurtleResponse {
  wpm: number;
  game_pass: boolean;
  stutter_detected: boolean;
  block_detected: boolean;
  clinical_pass: boolean;
  confidence: number;
  feedback: string;
  pauseBonus?: boolean;
  detectedPauses?: number;
}

/**
 * Backend response from Flask /analyze/balloon endpoint
 */
export interface BalloonResponse {
  breath_detected: boolean;
  amplitude_onset: number;
  game_pass: boolean;
  hard_attack_detected: boolean;
  clinical_pass: boolean;
  confidence: number;
  feedback: string;
}

/**
 * Backend response from Flask /analyze/tapping endpoint
 * Used for syllable-based fluency detection in the tapping game
 */
export interface TappingResponse {
  repetition_detected: boolean;
  repetition_prob: number;
  clinical_pass: boolean;
  confidence: number;
  feedback: string;
}

/**
 * Exercise attempt payload saved to Firestore activity_logs
 */
export interface ExerciseAttemptPayload {
  uid: string;
  exerciseType: 'turtle' | 'snake' | 'balloon' | 'tapping' | 'onetap'; // 'onetap' kept for backward compatibility with existing Firestore data
  gamePass: boolean;
  clinicalPass: boolean;
  confidence: number;
  feedback: string;
  metrics: Record<string, number | boolean>;
  createdAt?: string;
}

/**
 * User statistics tracked per user in Firestore
 */
export interface UserStats {
  currentStreak: number;
  lastActivityDate: string | null;
  sessionsThisWeek: number;
  weekStartDate: string;
  totalXP: number;
}

/**
 * Audio upload result from audio service
 */
export interface UploadResult {
  ok: boolean;
  status: number;
  json?: Record<string, unknown>;
  error?: string;
}
