/**
 * Balloon Game Types
 * Easy Onset therapeutic exercise for soft attack practice
 */

export interface BalloonLevel {
  levelId: string;
  tier: 1 | 2 | 3;
  phonemeCode: string; // e.g., "AA", "P", "SH"
  targetWord?: string; // e.g., "Puppy"
  maxAttackSlope: number; // Max db/ms for soft onset (e.g., 0.5)
  xpReward: number;
}

export interface BalloonMetrics {
  amplitude_start: number; // Initial amplitude at onset
  amplitude_peak?: number; // Peak amplitude reached
  onset_slope_measured: number; // Measured db/ms rise time
  onset_slope_detected?: number; // Backend-detected slope
  pop_detected: boolean; // Hard attack detected (delta > 0.6)
  soft_onset?: boolean; // Soft onset confirmed (slope <= maxAttackSlope)
}

export interface BalloonSessionState {
  isReady: boolean;
  isRecording: boolean;
  inflationLevel: number; // 0..1, visual representation
  hasPopped: boolean;
  onsetSlope: number; // Calculated slope
}
