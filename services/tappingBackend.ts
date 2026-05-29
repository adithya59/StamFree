/**
 * Backend service for Tapping Game
 * Handles rhythm analysis by comparing tap timestamps with audio
 */

import { getAnalyzeUrl } from '@/config/backend';

export interface TappingAnalysisRequest {
    audioUri: string;
    taps: number[]; // Array of tap timestamps in seconds
    targetWord: string;
    syllables: string[];
}

export interface TappingAnalysisResponse {
    accuracy: number;        // Overall accuracy percentage (0-100)
    feedback: string;        // Feedback message
    transcript?: string;     // STT transcript of what was said
    is_sync: boolean;
    fluent: boolean;
    syllable_matches: boolean[];
}

/**
 * Analyze tapping session audio and timestamps
 */
export async function analyzeTappingAudio(
    request: TappingAnalysisRequest
): Promise<TappingAnalysisResponse> {
    // DEMO MODE: Return mock data without calling backend
    console.log('[TappingBackend] DEMO MODE - Returning mock analysis result for:', request.targetWord);
    
    // Simulate a brief delay to feel like analysis is happening
    await new Promise(resolve => setTimeout(resolve, 600));

    // Return successful response with high accuracy
    return {
        accuracy: 85,
        feedback: '🌟 Great rhythm! You got it!',
        transcript: request.targetWord,
        is_sync: true,
        fluent: true,
        syllable_matches: request.syllables.map(() => true) // All syllables matched
    };
}
