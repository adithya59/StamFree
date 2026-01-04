/**
 * Balloon Engine Component
 * Handles continuous amplitude sampling (50ms), inflation tracking, and pop detection
 */

import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef } from 'react';

export interface BalloonEngineProps {
  /** Whether ready to start recording */
  isReady: boolean;
  /** Whether currently recording */
  isRecording: boolean;
  /** Called when recording starts successfully */
  onRecordingStart: () => void;
  /** Called when recording stops (uri, duration in seconds) */
  onRecordingStop: (uri: string | null, duration: number) => void;
  /** Called on amplitude sample (every 50ms) */
  onAmplitudeSample?: (amplitude: number) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Children: render prop receiving tap handler and recording state */
  children: (props: { 
    onTap: () => void; 
    isRecording: boolean;
    inflationLevel: number;
  }) => React.ReactNode;
}

const AMPLITUDE_SAMPLE_INTERVAL = 50; // 50ms
const MAX_RECORDING_DURATION = 5000; // 5 seconds

export const BalloonEngine: React.FC<BalloonEngineProps> = ({
  isReady,
  isRecording,
  onRecordingStart,
  onRecordingStop,
  onAmplitudeSample,
  onError,
  children,
}) => {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const samplingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inflationLevelRef = useRef<number>(0);

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

      await recording.startAsync();
      recordingRef.current = recording;
      recordingStartTimeRef.current = Date.now();
      inflationLevelRef.current = 0;

      // Start sampling amplitude every 50ms
      samplingIntervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;

        try {
          const status = await recordingRef.current.getStatusAsync();

          if (status.isRecording && status.metering !== undefined) {
            const dbValue = status.metering;
            // Normalize: -160db → 0, 0db → 1
            const amplitude = Math.max(0, Math.min(1, (dbValue + 160) / 160));

            onAmplitudeSample?.(amplitude);
            inflationLevelRef.current = amplitude;

            // Check max duration
            if (recordingStartTimeRef.current) {
              const elapsed = Date.now() - recordingStartTimeRef.current;
              if (elapsed >= MAX_RECORDING_DURATION) {
                stopRecording();
              }
            }
          }
        } catch (error) {
          console.error('Amplitude sampling error:', error);
        }
      }, AMPLITUDE_SAMPLE_INTERVAL);

      onRecordingStart();
    } catch (error) {
      onError?.(error as Error);
    }
  }, [onRecordingStart, onAmplitudeSample, onError]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    try {
      // Clear sampling interval
      if (samplingIntervalRef.current) {
        clearInterval(samplingIntervalRef.current);
        samplingIntervalRef.current = null;
      }

      if (!recordingRef.current) return;

      const recording = recordingRef.current;
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      const duration = recordingStartTimeRef.current
        ? (Date.now() - recordingStartTimeRef.current) / 1000
        : 0;

      recordingStartTimeRef.current = null;

      onRecordingStop(uri, duration);
    } catch (error) {
      onError?.(error as Error);
      onRecordingStop(null, 0);
    }
  }, [onRecordingStop, onError]);

  /**
   * Handle tap to start
   */
  const handleTap = useCallback(() => {
    if (!isReady || isRecording) return;
    startRecording();
  }, [isReady, isRecording, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (samplingIntervalRef.current) {
        clearInterval(samplingIntervalRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  return (
    <>
      {children({
        onTap: handleTap,
        isRecording,
        inflationLevel: inflationLevelRef.current,
      })}
    </>
  );
};
