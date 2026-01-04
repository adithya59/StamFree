/**
 * One-Tap Game Progression Logic
 * Tier scaffolding and pass/fail criteria for One-Tap (Impulse Control)
 */

import type { OneTapLevel, OneTapMetrics } from '@/types/onetap';

/**
 * Pass condition: attempts == 1 AND repetition_prob < 0.1
 */
export function evaluateOneTapPass(
  metrics: OneTapMetrics,
  attempts: number,
  level: OneTapLevel
): boolean {
  // Pass condition: attempts==1 and backend says no repetition
  return attempts === 1 && !metrics.repetitionDetected;
}

/**
 * Tier definitions (from spec):
 * - Tier 1: 2-syllable words (The Two-Step)
 * - Tier 2: 3-syllable words (The Tri-Step)
 * - Tier 3: 4+ syllable words (The Complex)
 */
export function getTierForOneTap(syllableCount: number): 1 | 2 | 3 {
  if (syllableCount === 2) return 1;
  if (syllableCount === 3) return 2;
  return 3; // 4+ syllables
}
