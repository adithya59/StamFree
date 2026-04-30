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
  const analysisStartTime = performance.now();
  let lastError: Error | null = null;

  // Attempt with retries
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[SnakeAnalysis] Retry attempt ${attempt + 1} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log('[SnakeAnalysis] Starting analysis for', audioUri, `(attempt ${attempt + 1})`);
      
      const formData = createFormData(audioUri);
      
      // Add game metrics and optional fields
      appendFormDataFields(formData, {
        durationAchieved: gameMetrics.durationAchieved,
        targetDuration: gameMetrics.targetDuration,
        completionPercentage: gameMetrics.completionPercentage,
        targetPhoneme: promptPhoneme,
        tier: tier,
      });
      // Use new /snake/analyze endpoint
      const url = getAnalyzeUrl('snake');
      
      // Upload with 10 second timeout
      const result: UploadResult = await uploadAudioWithTimeout(url, formData, 10000);
      
      if (!result.ok || !result.json) {
        lastError = new Error(result.error || 'Unknown upload error');
        console.error('[SnakeAnalysis] Upload failed:', lastError.message);
        continue; // Retry
      }

      const apiResponse = result.json as unknown as SnakeAPIResponse;
      console.log('[SnakeAnalysis] Backend result:', apiResponse);

      // Check for API-level errors
      if (!apiResponse.success || !apiResponse.data) {
        lastError = new Error(apiResponse.error || 'Analysis failed');
        console.error('[SnakeAnalysis] API error:', lastError.message);
        continue; // Retry
      }

      const data = apiResponse.data;
      const stars = data.stars;

      // Log to Firestore activity_logs
      if (auth.currentUser) {
        try {
          await saveExerciseAttempt({
            uid: auth.currentUser.uid,
            exerciseType: 'snake',
            gamePass: data.gamePass,
            clinicalPass: data.clinicalPass,
            confidence: data.debug.confidence,
            feedback: data.feedback,
            metrics: {
              ...data.metrics,
              phonemeMatch: data.metrics.phonemeMatch ?? false, // Convert null to false
              // Include game metrics
              durationAchieved: gameMetrics.durationAchieved,
              targetDuration: gameMetrics.targetDuration,
              completionPercentage: gameMetrics.completionPercentage,
              pauseCount: gameMetrics.pauseCount,
              totalPauseDuration: gameMetrics.totalPauseDuration,
              starsAwarded: stars,
            },
          });
          console.log('[SnakeAnalysis] Logged attempt to Firestore');
        } catch (logErr) {
          console.error('[SnakeAnalysis] Failed to log attempt:', logErr);
          // Don't fail the whole analysis if logging fails
        }
      }

      const totalLatency = performance.now() - analysisStartTime;
      console.log(`[SnakeAnalysis] ✅ Analysis complete in ${totalLatency.toFixed(0)}ms (${attempt + 1} attempt${attempt > 0 ? 's' : ''})`);
      
      // Warn if latency exceeds target (5 seconds)
      if (totalLatency > 5000) {
        console.warn(`[SnakeAnalysis] ⚠️ AI latency exceeded 5s target: ${totalLatency.toFixed(0)}ms`);
      }

      return {
        stars: data.stars,
        feedback: data.feedback,
        confidence: data.debug.confidence,
        metrics: data.metrics as Record<string, number | boolean>,
        gamePass: data.gamePass,
        clinicalPass: data.clinicalPass,
        xp: data.xp,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`[SnakeAnalysis] Attempt ${attempt + 1} failed:`, error);
    }
  }

  // All retries failed - queue for offline processing
  const totalLatency = performance.now() - analysisStartTime;
  console.error(`[SnakeAnalysis] ❌ All retry attempts failed after ${totalLatency.toFixed(0)}ms:`, lastError?.message);
  await queueOfflineAttempt(audioUri, gameMetrics, promptPhoneme);

  return null;
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


