/**
 * Tapping Game Type Definitions
 * 
 * Consolidated types for the Tapping (Impulse Control) game module.
 * This file serves as the single source of truth for all Tapping-related types.
 */

/**
 * Tapping content item from Firestore pool
 * Represents a single word/phrase children tap syllables for
 */
export interface TappingContent {
  id: string;
  text: string;
  syllables: string[];
  tier: 1 | 2 | 3;
  category: string;
}

/**
 * Re-export types from their canonical locations for convenience
 */
export type { TappingAnalysisResponse } from '@/services/tappingBackend';
