/**
 * One-Tap Engine Component
 * Handles single tap to start recording, auto-stop on silence or max duration
 * Exposes callbacks to Brain (useOneTapSession)
 */

import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef } from 'react';

export interface OneTapEngineProps {
  /** Whether the button is ready (not in cooldown) */
  isReady: boolean;
  /** Whether currently recording */
  isRecording: boolean;
  /** Called when recording starts successfully */
  onRecordingStart: () => void;
  /** Called when recording stops (uri, duration in seconds) */
  onRecordingStop: (uri: string | null, duration: number) => void;
  /** Called on audio errors */
  onError?: (error: Error) => void;
  /** Children: render prop receiving tap handler and recording state */
  children: (props: { onTap: () => void; isRecording: boolean }) => React.ReactNode;
}

const SILENCE_THRESHOLD = 0.1; // Same as Snake
const SILENCE_DURATION_TO_STOP = 1.0; // Stop after 1s silence
const MAX_RECORDING_DURATION = 5.0; // Max 5s

export const OneTapEngine: React.FC<OneTapEngineProps> = ({
  isReady,
  isRecording,
  onRecordingStart,
  onRecordingStop,
  onError,
  children,
}) => {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const silenceStartTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      // Monitor amplitude for auto-stop
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording || status.metering === undefined) return;

        const dbValue = status.metering;
        const amplitude = Math.max(0, Math.min(1, (dbValue + 160) / 160));

        // Silence detection
        if (amplitude < SILENCE_THRESHOLD) {
          if (!silenceStartTimeRef.current) {
            silenceStartTimeRef.current = Date.now();
          } else {
            const silenceDuration = (Date.now() - silenceStartTimeRef.current) / 1000;
            if (silenceDuration >= SILENCE_DURATION_TO_STOP) {
              stopRecording();
            }
          }
        } else {
          silenceStartTimeRef.current = null;
        }

        // Max duration check
        if (recordingStartTimeRef.current) {
          const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
          if (elapsed >= MAX_RECORDING_DURATION) {
            stopRecording();
          }
        }
      });

      await recording.startAsync();
      recordingRef.current = recording;
      recordingStartTimeRef.current = Date.now();
      silenceStartTimeRef.current = null;

      onRecordingStart();
    } catch (error) {
      onError?.(error as Error);
    }
  }, [onRecordingStart, onError]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) return;

      const recording = recordingRef.current;
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      const duration = recordingStartTimeRef.current
        ? (Date.now() - recordingStartTimeRef.current) / 1000
        : 0;

      recordingStartTimeRef.current = null;
      silenceStartTimeRef.current = null;

      onRecordingStop(uri, duration);
    } catch (error) {
      onError?.(error as Error);
      onRecordingStop(null, 0);
    }
  }, [onRecordingStop, onError]);

  /**
   * Handle tap
   */
  const handleTap = useCallback(() => {
    if (!isReady || isRecording) return;
    startRecording();
  }, [isReady, isRecording, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return <>{children({ onTap: handleTap, isRecording })}</>;
};
