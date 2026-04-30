/**
 * Clinical Logic Normalization
 * 
 * Converts game-specific backend responses into a unified result format
 * for consistent handling across all game types.
 */

import type { TurtleResponse, BalloonResponse, TappingResponse, UnifiedResult } from '@/types/shared';

export type { TurtleResponse, BalloonResponse, TappingResponse, UnifiedResult } from '@/types/shared';

export function normalizeTurtle(res: TurtleResponse): UnifiedResult {
  return {
    game_pass: res.game_pass,
    clinical_pass: res.clinical_pass,
    feedback: res.feedback,
    confidence: res.confidence,
    metrics: {
      wpm: res.wpm,
      stutter_detected: res.stutter_detected,
      block_detected: res.block_detected,
      ...(typeof res.pauseBonus === 'boolean' ? { pauseBonus: res.pauseBonus } : {}),
      ...(typeof res.detectedPauses === 'number' ? { detectedPauses: res.detectedPauses } : {}),
    },
  };
}
