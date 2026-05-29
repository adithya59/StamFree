import { getAnalyzeUrl } from '@/config/backend';
import { createFormData, uploadAudioWithTimeout, appendFormDataFields, type UploadResult } from '@/services/audio';
import { normalizeTurtle, type TurtleResponse, type UnifiedResult } from '@/services/clinicalLogic';
import type { UploadResult as SharedUploadResult } from '@/types/shared';

export interface TurtleAnalysisResult extends UnifiedResult {
  wpm: number;
}

/**
 * Send audio to Flask backend for Turtle analysis (WPM & Fluency)
 */
export async function analyzeTurtleAudio(
  audioUri: string,
  targetText?: string,
  tier?: number,
  requiredPauses?: number
): Promise<TurtleAnalysisResult | null> {
  // DEMO MODE: Return mock data without calling backend
  console.log('[TurtleAnalysis] DEMO MODE - Returning mock analysis result');
  
  // Simulate a brief delay to feel like analysis is happening
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return WPM within tier range to get "perfect pace" feedback
  // Tier 1 (Jungle): 40-70 WPM, Tier 2 (River): 60-90 WPM, Tier 3 (Mountain): 80-110 WPM
  const tierRanges = {
    1: 55, // Mid-range for Jungle
    2: 75, // Mid-range for River
    3: 95, // Mid-range for Mountain
  };
  const mockWpm = tierRanges[tier as keyof typeof tierRanges] || 55;

  return {
    game_pass: true,
    clinical_pass: true,
    feedback: '🐢 Wonderful sentence reading! Keep it up!',
    confidence: 0.88,
    metrics: {
      stutteringDetected: false,
      blockDetected: false,
      pauseDetected: requiredPauses ? true : false,
      correctPronunciation: true,
    },
    wpm: mockWpm,
  };
}
