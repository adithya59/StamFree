/**
 * One-Tap Session Hook (Brain)
 * State machine: Idle (ready) → Recording → Processing → Cooldown (fail/stop) or Success
 * Cooldown: uniform random 3–5s by default (or level override)
 */

import { evaluateOneTapPass } from '@/services/onetapProgression';
import type { OneTapLevel, OneTapMetrics, OneTapSessionState } from '@/types/onetap';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseOneTapSessionOptions {
  level: OneTapLevel;
  onSuccess?: (metrics: OneTapMetrics) => void;
  onFail?: (metrics: OneTapMetrics) => void;
}

export function useOneTapSession(options: UseOneTapSessionOptions) {
  const { level, onSuccess, onFail } = options;

  const [sessionState, setSessionState] = useState<OneTapSessionState>({
    isReady: true,
    isRecording: false,
    cooldownRemaining: 0,
    attempts: 0,
  });

  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  /**
   * Start cooldown timer (uniform random 3–5s or level override)
   * Must be defined before stopRecording since it's used in stopRecording
   */
  const startCooldown = useCallback(() => {
    const cooldownDuration =
      level.cooldownDurationSec ?? Math.floor(Math.random() * 3) + 3; // 3–5s random

    setSessionState((prev) => ({
      ...prev,
      isReady: false,
      cooldownRemaining: cooldownDuration,
    }));

    // Clear any existing timer
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    // Decrement cooldown every second
    cooldownTimerRef.current = setInterval(() => {
      setSessionState((prev) => {
        const newRemaining = prev.cooldownRemaining - 1;
        if (newRemaining <= 0) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return { ...prev, isReady: true, cooldownRemaining: 0 };
        }
        return { ...prev, cooldownRemaining: newRemaining };
      });
    }, 1000);
  }, [level.cooldownDurationSec]);

  /**
   * Start recording
   */
  const startRecording = useCallback(() => {
    if (!sessionState.isReady || sessionState.isRecording) return;

    setSessionState((prev) => ({
      ...prev,
      isRecording: true,
      attempts: prev.attempts + 1,
    }));

    recordingStartTimeRef.current = Date.now();
  }, [sessionState.isReady, sessionState.isRecording]);

  /**
   * Stop recording and evaluate
   */
  const stopRecording = useCallback(
    async (audioUri: string | null, recordingDuration: number) => {
      if (!sessionState.isRecording) return;

      setSessionState((prev) => ({ ...prev, isRecording: false }));

      const reactionTime = recordingStartTimeRef.current
        ? Date.now() - recordingStartTimeRef.current
        : 0;

      // Optimistic fail conditions
      if (recordingDuration < 0.5 || recordingDuration > 3.0 || !audioUri) {
        // Too short/long or no audio → fail with cooldown
        const metrics: OneTapMetrics = {
          reactionTime,
          recordingDuration,
          repetitionDetected: true, // treat as fail
        };
        onFail?.(metrics);
        startCooldown();
        return;
      }

      try {
        // Send audio to backend for repetition detection
        const { analyzeOneTapAudio } = await import('@/services/onetapBackend');
        const analysis = await analyzeOneTapAudio({
          audioUri,
          targetWord: level.targetWord,
          syllables: level.syllables, // Now an array like ['Spa', 'ghet', 'ti']
          duration: recordingDuration,
        });

        const metrics: OneTapMetrics = {
          reactionTime,
          recordingDuration,
          repetitionDetected: analysis.repetitionDetected,
        };

        // Log analysis details for debugging
        console.log('One-Tap Analysis:', {
          wordCount: analysis.wordCount,
          transcript: analysis.transcript,
          durationValid: analysis.durationValid,
          repetitionDetected: analysis.repetitionDetected,
        });

        const passed = evaluateOneTapPass(metrics, sessionState.attempts, level);

        if (passed) {
          onSuccess?.(metrics);
        } else {
          onFail?.(metrics);
          startCooldown();
        }
      } catch (error) {
        console.error('Backend analysis failed:', error);
        // Fallback: treat as fail with cooldown
        const metrics: OneTapMetrics = {
          reactionTime,
          recordingDuration,
          repetitionDetected: true,
        };
        onFail?.(metrics);
        startCooldown();
      }
    },
    [sessionState.isRecording, sessionState.attempts, level, onSuccess, onFail, startCooldown]
  );

  /**
   * Reset session
   */
  const reset = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setSessionState({
      isReady: true,
      isRecording: false,
      cooldownRemaining: 0,
      attempts: 0,
    });
    recordingStartTimeRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  return {
    sessionState,
    startRecording,
    stopRecording,
    reset,
  };
}
