/**
 * Turtle Game Type Definitions
 * 
 * Consolidated types for the Turtle (Rate Control) game module.
 * This file serves as the single source of truth for all Turtle-related types.
 */

/**
 * Turtle content item from Firestore pool
 */
export interface TurtleContent {
  id: string;
  text: string;
  wordCount: number;
  tier: 1 | 2 | 3;
  requiredPauses?: number;
  chunkedText?: string;
}

/**
 * Re-export types from their canonical locations for convenience
 */
export type { TurtlePlaylist } from '@/services/turtlePlaylist';
export type { TurtleAnalysisResult } from '@/services/turtleAnalysis';
