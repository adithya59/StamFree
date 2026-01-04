/**
 * Backend service for Balloon game
 * Handles onset slope detection via ML endpoint
 */

import { getAnalyzeUrl } from '@/config/backend';

export interface BalloonAnalysisRequest {
  audioUri: string;
  targetPhoneme: string;
  maxAttackSlope: number;
}

export interface BalloonAnalysisResponse {
  onset_slope: number;
  soft_onset: boolean;
  pop_detected: boolean;
  confidence: number;
}

/**
 * Analyze audio for onset slope and pop detection using backend ML model
 */
export async function analyzeBalloonAudio(
  request: BalloonAnalysisRequest
): Promise<BalloonAnalysisResponse> {
  try {
    const formData = new FormData();

    // Create file from URI
    const response = await fetch(request.audioUri);
    const blob = await response.blob();

    formData.append('audio', blob, 'recording.m4a');
    formData.append('phoneme', request.targetPhoneme);
    formData.append('max_attack_slope', request.maxAttackSlope.toString());

    const analyzeUrl = getAnalyzeUrl('balloon');
    const result = await fetch(analyzeUrl, {
      method: 'POST',
      body: formData,
    });

    if (!result.ok) {
      throw new Error(`Backend returned ${result.status}: ${result.statusText}`);
    }

    const data = await result.json();

    return {
      onset_slope: data.onset_slope ?? 0,
      soft_onset: data.soft_onset ?? false,
      pop_detected: data.pop_detected ?? false,
      confidence: data.confidence ?? 0,
    };
  } catch (error) {
    console.error('Failed to analyze Balloon audio:', error);
    throw error;
  }
}
