/**
 * One-Tap Game Type Definitions
 * Defines level, metrics, and session state for One-Tap (Impulse Control) game
 */

export interface OneTapLevel {
  levelId: string;
  tier: 1 | 2 | 3;
  targetWord: string;
  syllables: string[]; // Array of syllable strings e.g., ['Mon', 'key']
  syllableCount: number; // Total count for calculations
  xpReward: number;
  cooldownDurationSec?: number; // Optional per-level override; default is random 3–5s
  maxRepetitions: number; // Usually 0 for One-Tap
  ipa?: string; // Optional IPA transcription
  category?: string; // Optional category (animals, food, etc.)
}

export interface OneTapMetrics {
  reactionTime: number;      // ms from "Ready" to first voice
  recordingDuration: number; // Total recording time in seconds
  repetitionDetected: boolean;
}

export interface OneTapSessionState {
  isReady: boolean;
  isRecording: boolean;
  cooldownRemaining: number; // 0 to 5 seconds
  attempts: number;
}

/**
 * Word Deck Progression System
 * Tracks individual word mastery using accumulative wins (not percentage)
 */
export interface OneTapWordStats {
  id: string;            // Word ID e.g., 'banana'
  successCount: number;  // How many times passed cleanly? (Target: 3)
  failCount: number;     // How many impulse errors?
  isMastered: boolean;   // Has reached MASTERY_THRESHOLD (3 successes)
}

export interface OneTapPlaylist {
  userId: string;
  activeWords: string[];   // Array of IDs ['monkey', 'apple', 'tiger', ...] (Always 5)
  masteredWords: string[]; // Words that reached 3 successes ['baby', 'cat']
  lockedWords: string[];   // Remaining words from content_bank sorted by Tier
  
  // Specific stats to track progress per word
  stats: Record<string, OneTapWordStats>; // { 'banana': { successCount: 2, ... } }
}
