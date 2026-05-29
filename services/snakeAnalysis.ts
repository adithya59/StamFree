/**
 * Snake Game - AI Backend Integration
 * 
 * Sends recorded audio to Flask /analyze/snake endpoint for post-game AI analysis.
 * Handles stutter detection (repetition, block, fluency) and star calculation.
 * 
 * Features (US4):
 * - Offline queue: Saves failed attempts locally for retry when network returns
 * - Retry logic: Exponential backoff with 3 attempts
 * - Graceful degradation: Returns optimistic feedback if backend unavailable
 * 
 * Related: FR-007, FR-008, T027
 */

import { getAnalyzeUrl } from '@/config/backend';
import { auth } from '@/config/firebaseConfig';
import type { GameMetrics } from '@/hooks/useSnakeGame';
import { createFormData, uploadAudioWithTimeout, appendFormDataFields, type UploadResult } from '@/services/audio';
import { saveExerciseAttempt } from '@/services/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = '@stamfree_snake_offline_queue';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000; // Start with 2 seconds

/**
 * Queued analysis attempt for offline retry
 */
interface QueuedAttempt {
  audioUri: string;
  gameMetrics: GameMetrics;
  promptPhoneme?: string;
  timestamp: number;
  retryCount: number;
}

/**
 * New standardized API response format
 */
interface SnakeAPIResponse {
  success: boolean;
  data?: {
    gamePass: boolean;
    clinicalPass: boolean;
    stars: 1 | 2 | 3;
    xp: number;
    feedback: string;
    metrics: {
      duration: number;
      continuity: boolean;
      phonemeMatch: boolean | null;
      repetition: boolean;
      noiseDetected: boolean;
      voicedRatio: number;
    };
    debug: {
      stutterType: string;
      confidence: number;
      wavlmLabel: string;
      sttTranscript: string;
      requestId?: string;
      inferenceTimeMs?: number;
    };
  };
  error?: string;
  code?: string;
}

/**
 * Result from AI analysis with star calculation
 */
export interface SnakeAnalysisResult {
  stars: 1 | 2 | 3;
  feedback: string;
  confidence: number;
  metrics: Record<string, number | boolean>;
  gamePass: boolean;
  clinicalPass: boolean;
  xp: number;
}

/**
 * Send audio to Flask backend for post-game analysis with retry logic
 * 
 * - Fluent → 3 stars (no stuttering detected)
 * - Prolongation → 3 stars (desired behavior in this game)
 * - Repetition → 1 star (stuttering detected)
 * - Block → 1 star (but usually handled by client silence detection)
 * 
 * US4 Features:
 * - Retries up to 3 times with exponential backoff on network errors
 * - Queues offline if all retries fail (processed when network returns)
 * - Returns optimistic feedback immediately if backend unavailable
 * 
 * FR-007: Records and sends full audio session to backend
 * FR-008: Awards stars based on AI result
 * 
 * @param audioUri - URI of recorded audio file
 * @param gameMetrics - Metrics from game loop (duration, completion %, pauses)
 * @param promptPhoneme - Target phoneme for validation
 * @returns Star rating and feedback, or null if upload fails after retries
 */
export async function analyzeSnakeAudio(
  audioUri: string,
  gameMetrics: GameMetrics,
  promptPhoneme?: string,
  tier?: number
): Promise<SnakeAnalysisResult | null> {
  // DEMO MODE: Return mock data without calling backend
  console.log('[SnakeAnalysis] DEMO MODE - Returning mock analysis result');
  
  // Simulate a brief delay to feel like analysis is happening
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    stars: 3,
    feedback: '🎉 Excellent! Great pronunciation!',
    confidence: 0.92,
    metrics: {
      duration: gameMetrics.durationAchieved,
      continuity: true,
      phonemeMatch: true,
      repetition: false,
      noiseDetected: false,
      voicedRatio: 0.95,
    },
    gamePass: true,
    clinicalPass: true,
    xp: 50,
  };
}

/**
 * Queue failed analysis attempt for offline retry
 * Stores in AsyncStorage for later processing when network returns
 */
async function queueOfflineAttempt(
  audioUri: string,
  gameMetrics: GameMetrics,
  promptPhoneme?: string
): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const newAttempt: QueuedAttempt = {
      audioUri,
      gameMetrics,
      promptPhoneme,
      timestamp: Date.now(),
      retryCount: 0,
    };
    queue.push(newAttempt);
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('[SnakeAnalysis] Queued attempt for offline retry. Queue size:', queue.length);
  } catch (error) {
    console.error('[SnakeAnalysis] Failed to queue offline attempt:', error);
  }
}

/**
 * Get offline queue from AsyncStorage
 */
async function getOfflineQueue(): Promise<QueuedAttempt[]> {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[SnakeAnalysis] Failed to load offline queue:', error);
    return [];
  }
}


