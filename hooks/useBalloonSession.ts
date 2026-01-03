/**
 * Balloon Session Hook (Brain)
 * Samples amplitude every 50ms, computes onset slope, detects hard attacks (delta > 0.6)
 * Tracks inflation level (0..1) based on sustained amplitude
 */

import { evaluateBalloonPass } from '@/services/balloonProgression';
import type { BalloonLevel, BalloonMetrics } from '@/types/balloon';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseBalloonSessionOptions {
  level: BalloonLevel;
  onSuccess?: (metrics: BalloonMetrics) => void;
  onFail?: (metrics: BalloonMetrics) => void;
}

export interface BalloonSessionState {
  isReady: boolean;
  isRecording: boolean;
  inflationLevel: number; // 0..1
  hasPopped: boolean;
  onsetSlope: number; // rise time (db/ms)
}

export function useBalloonSession(options: UseBalloonSessionOptions) {
  const { level, onSuccess, onFail } = options;

  const [sessionState, setSessionState] = useState<BalloonSessionState>({
    isReady: true,
    isRecording: false,
    inflationLevel: 0,
    hasPopped: false,
    onsetSlope: 0,
  });

  const recordingStartTimeRef = useRef<number | null>(null);
  const amplitudeSamplesRef = useRef<Array<{ time: number; amplitude: number }>>([]);
  const lastAmplitudeRef = useRef<number>(0);
  const maxAmplitudeRef = useRef<number>(0);

  /**
   * Start recording
   */
  const startRecording = useCallback(() => {
    if (!sessionState.isReady || sessionState.isRecording) return;

    setSessionState((prev: BalloonSessionState) => ({
      ...prev,
      isRecording: true,
      inflationLevel: 0,
      hasPopped: false,
      onsetSlope: 0,
    }));

    recordingStartTimeRef.current = Date.now();
    amplitudeSamplesRef.current = [];
    lastAmplitudeRef.current = 0;
    maxAmplitudeRef.current = 0;
  }, [sessionState.isReady, sessionState.isRecording]);

  /**
   * Process amplitude sample (called every 50ms from Engine)
   */
  const processAmplitudeSample = useCallback((amplitude: number) => {
    if (!sessionState.isRecording) return;

    const now = Date.now();
    const elapsed = recordingStartTimeRef.current ? now - recordingStartTimeRef.current : 0;

    amplitudeSamplesRef.current.push({ time: elapsed, amplitude });

    // Detect hard attack: delta > 0.6 in 50ms window
    const delta = amplitude - lastAmplitudeRef.current;
    if (delta > 0.6) {
      setSessionState((prev: BalloonSessionState) => ({ ...prev, hasPopped: true }));
    }

    // Update inflation level (sustain >= 0.5 db normalized)
    if (amplitude > 0.5) {
      const newInflation = Math.min(1, amplitude / 1.0); // Normalize to 1.0 max
      setSessionState((prev: BalloonSessionState) => ({
        ...prev,
        inflationLevel: newInflation,
      }));
      maxAmplitudeRef.current = Math.max(maxAmplitudeRef.current, amplitude);
    }

    lastAmplitudeRef.current = amplitude;
  }, [sessionState.isRecording]);

  /**
   * Stop recording and evaluate
   */
  const stopRecording = useCallback(
    async (audioUri: string | null, recordingDuration: number) => {
      if (!sessionState.isRecording) return;

      setSessionState((prev: BalloonSessionState) => ({ ...prev, isRecording: false }));

      // Calculate onset slope from early samples (first 200ms)
      let onsetSlope = 0;
      const earlySamples = amplitudeSamplesRef.current.filter((s) => s.time <= 200);
      if (earlySamples.length >= 2) {
        const firstSample = earlySamples[0];
        const lastSample = earlySamples[earlySamples.length - 1];
        const deltaDb = lastSample.amplitude - firstSample.amplitude;
        const deltaTime = lastSample.time - firstSample.time || 1;
        onsetSlope = deltaDb / deltaTime; // db/ms
      }

      try {
        // Backend analysis - create the service file first
        const metrics: BalloonMetrics = {
          amplitude_start: amplitudeSamplesRef.current[0]?.amplitude ?? 0,
          amplitude_peak: maxAmplitudeRef.current,
          onset_slope_measured: onsetSlope,
          onset_slope_detected: onsetSlope,
          pop_detected: sessionState.hasPopped,
          soft_onset: !sessionState.hasPopped && onsetSlope <= level.maxAttackSlope,
        };

        const passed = evaluateBalloonPass(
          onsetSlope,
          level.maxAttackSlope,
          sessionState.inflationLevel
        );

        if (passed) {
          onSuccess?.(metrics);
        } else {
          onFail?.(metrics);
        }
      } catch (error) {
        console.error('Evaluation failed:', error);
        // Fallback: use local metrics
        const metrics: BalloonMetrics = {
          amplitude_start: amplitudeSamplesRef.current[0]?.amplitude ?? 0,
          amplitude_peak: maxAmplitudeRef.current,
          onset_slope_measured: onsetSlope,
          onset_slope_detected: onsetSlope,
          pop_detected: sessionState.hasPopped,
          soft_onset: !sessionState.hasPopped && onsetSlope <= level.maxAttackSlope,
        };
        onFail?.(metrics);
      }
    },
    [sessionState.isRecording, sessionState.hasPopped, sessionState.inflationLevel, level, onSuccess, onFail]
  );

  /**
   * Reset session
   */
  const reset = useCallback(() => {
    setSessionState({
      isReady: true,
      isRecording: false,
      inflationLevel: 0,
      hasPopped: false,
      onsetSlope: 0,
    });
    recordingStartTimeRef.current = null;
    amplitudeSamplesRef.current = [];
    lastAmplitudeRef.current = 0;
    maxAmplitudeRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      amplitudeSamplesRef.current = [];
    };
  }, []);

  return {
    sessionState,
    startRecording,
    stopRecording,
    processAmplitudeSample,
    reset,
  };
}
