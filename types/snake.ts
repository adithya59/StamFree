/**
 * Snake Game Type Definitions
 * 
 * Consolidated types for the Snake (Prolongation) game module.
 * This file serves as the single source of truth for all Snake-related types.
 */

/**
 * Phoneme data structure used across Snake game
 * Unified from snakePlaylist.ts and component definitions
 */
export interface PhonemeData {
  id: string;
  phoneme: string;
  ipa: string;
  tier: 1 | 2;
  example: string;
  category: string;
}

/**
 * Re-export types from their canonical locations for convenience
 * (These remain in their original files but can be imported from here)
 */
export type { GameMetrics } from '@/hooks/useSnakeGame';
export type { GameState, LevelConfig } from '@/services/snakeGameLogic';
export type { SnakePlaylist } from '@/services/snakePlaylist';
export type { SnakeAnalysisResult } from '@/services/snakeAnalysis';
