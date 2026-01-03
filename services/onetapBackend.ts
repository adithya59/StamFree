/**
 * Backend service for One-Tap game
 * Handles repetition detection and STT word count analysis via ML endpoint
 */

import { getAnalyzeUrl } from '@/config/backend';

export interface OneTapAnalysisRequest {
  audioUri: string;
  targetWord: string;
  syllables: string[]; // Changed from number to array for syllable breakdown
  duration: number; // Recording duration in seconds for validation
}

export interface OneTapAnalysisResponse {
  repetitionDetected: boolean;
  repetitionProbability: number;
  confidence: number;
  wordCount?: number; // STT word count (should be 1 for success)
  transcript?: string; // Optional transcript for debugging
  durationValid?: boolean; // Duration check result
}

/**
 * Analyze audio for repetitions using backend ML model
 * Strategy: Check STT word count (should be exactly 1) + duration validation
 */
export async function analyzeOneTapAudio(
  request: OneTapAnalysisRequest
): Promise<OneTapAnalysisResponse> {
  try {
    const formData = new FormData();
    
    // Create file from URI
    const response = await fetch(request.audioUri);
    const blob = await response.blob();
    
    formData.append('audio', blob, 'recording.m4a');
    formData.append('target_word', request.targetWord);
    formData.append('syllables', JSON.stringify(request.syllables)); // Send syllable array
    formData.append('duration', request.duration.toString());

    const analyzeUrl = getAnalyzeUrl('onetap');
    const result = await fetch(analyzeUrl, {
      method: 'POST',
      body: formData,
    });

    if (!result.ok) {
      throw new Error(`Backend returned ${result.status}: ${result.statusText}`);
    }

    const data = await result.json();

    // Backend should return:
    // - word_count: Number of words detected by STT (1 = success, >1 = repetition)
    // - transcript: Full STT transcript for debugging
    // - duration_valid: Whether duration is within acceptable range
    // - repetition_detected: Final decision based on all factors

    return {
      repetitionDetected: data.repetition_detected ?? false,
      repetitionProbability: data.repetition_probability ?? 0,
      confidence: data.confidence ?? 0,
      wordCount: data.word_count,
      transcript: data.transcript,
      durationValid: data.duration_valid,
    };
  } catch (error) {
    console.error('Failed to analyze One-Tap audio:', error);
    throw error;
  }
}
