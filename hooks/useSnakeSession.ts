/**
 * Snake Session Hook (Brain Logic)
 * 
 * Manages session-level concerns: Playlist management (Sliding Window),
 * mastery tracking, and session configuration.
 * 
 * Refactored to support the "Playlist" architecture.
 */

import { auth } from '@/config/firebaseConfig';
import type { GameMetrics } from '@/hooks/useSnakeGame';
import { analyzeSnakeAudio, type SnakeAnalysisResult } from '@/services/snakeAnalysis';
import { getNextSnakeSession, recordSnakeSessionResult } from '@/services/snakePlaylist';
import { updateUserStatsOnActivity } from '@/services/statsService';
import { useCallback, useEffect, useState } from 'react';

export interface UseSnakeSessionOptions {
  /** Called when session is ready */
  onReady?: () => void;
  /** Called on critical errors */
  onError?: (error: Error) => void;
}

export interface SnakeSessionConfig {
  targetId: string;
  phoneme: string;
  ipa: string;
  tier: 1 | 2;
  example: string;
  category: string;
  targetDuration: number;
}

export interface UseSnakeSessionResult {
  /** Current session configuration (Active Phoneme) */
  sessionConfig: SnakeSessionConfig | null;
  /** Whether session is loading */
  isLoading: boolean;
  /** Whether completion analysis is in-flight */
  isAnalyzing: boolean;
  /** Load next session from playlist */
  loadSession: () => Promise<void>;
  /** Complete session with metrics and audio */
  completeSession: (
    metrics: GameMetrics,
    audioUri: string
  ) => Promise<CompleteSessionResult>;
}

export interface CompleteSessionResult {
  /** Optimistic stars (shown immediately) */
  optimisticStars: number;
  /** Promise resolving to AI analysis + mastery update */
  analysisPromise: Promise<AnalysisData | null>;
}

export interface AnalysisData {
  aiResult: SnakeAnalysisResult | null;
  leveledUp: boolean;
  nextPhoneme?: string;
  totalXp?: number;
}

export function useSnakeSession(
  options: UseSnakeSessionOptions = {}
): UseSnakeSessionResult {
  const { onReady, onError } = options;

  const [sessionConfig, setSessionConfig] = useState<SnakeSessionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * Load next session from the playlist service
   */
  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const config = await getNextSnakeSession(auth.currentUser.uid);
      setSessionConfig(config);
      setIsLoading(false);
      onReady?.();

      console.log('[SnakeSession] Loaded session:', config.phoneme);
    } catch (error) {
      console.error('[SnakeSession] Error loading session:', error);
      setIsLoading(false);
      onError?.(error as Error);
    }
  }, [onReady, onError]);

  /**
   * Complete session: calculate result, analyze, update mastery
   */
  const completeSession = useCallback(
    async (
      metrics: GameMetrics,
      audioUri: string
    ): Promise<CompleteSessionResult> => {
      if (!auth.currentUser || !sessionConfig) {
        throw new Error('Cannot complete session: missing config');
      }

      // 1. Calculate optimistic result
      const optimisticStars = metrics.completionPercentage >= 100 ? 3 : 1;

      // 2. Start AI analysis & Mastery update
      const analysisPromise = (async (): Promise<AnalysisData | null> => {
        setIsAnalyzing(true);
        try {
          // A. Analyze Audio
          const aiResult = await analyzeSnakeAudio(
            audioUri,
            metrics,
            sessionConfig.phoneme,
            sessionConfig.tier
          );

          const finalStars = aiResult ? aiResult.stars : optimisticStars;
          // Use backend's xp_earned calculation (tier-based deduction)
          // Fallback based on tier if backend doesn't return xp_earned
          let xpEarned = aiResult?.xp_earned;
          if (!xpEarned) {
            // Tier 1: 10/7/4, Tier 2: 20/15/10, Tier 3: 30/23/16
            const tier = sessionConfig.tier || 1;
            if (tier === 1) {
              xpEarned = finalStars === 3 ? 10 : (finalStars === 2 ? 7 : 4);
            } else if (tier === 2) {
              xpEarned = finalStars === 3 ? 20 : (finalStars === 2 ? 15 : 10);
            } else {
              xpEarned = finalStars === 3 ? 30 : (finalStars === 2 ? 23 : 16);
            }
          }

          // B. Update Playlist Mastery (The Slide)
          const { leveledUp, nextPhoneme } = await recordSnakeSessionResult(
            auth.currentUser!.uid,
            sessionConfig.targetId,
            finalStars === 3  // Only "master" on 3 stars
          );

          // C. Update Global Stats (Streak, Weekly Sessions, XP)
          const newStats = await updateUserStatsOnActivity(xpEarned);

          if (leveledUp) {
            console.log(`[SnakeSession] Mastered ${sessionConfig.phoneme}! Next: ${nextPhoneme}`);
          }

          return {
            aiResult,
            leveledUp,
            nextPhoneme,
            totalXp: newStats?.totalXP
          };
        } catch (err) {
          console.error('[SnakeSession] Analysis failed:', err);
          return null;
        } finally {
          setIsAnalyzing(false);
        }
      })();

      return { optimisticStars, analysisPromise };
    },
    [sessionConfig]
  );

  // Initial load
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    sessionConfig,
    isLoading,
    isAnalyzing,
    loadSession,
    completeSession,
  };
}