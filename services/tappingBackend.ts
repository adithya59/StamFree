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
    try {
        const formData = new FormData();

        // Determine file extension and MIME type from URI
        const ext = request.audioUri.split('.').pop()?.toLowerCase() || 'm4a';
        const mimeType = ext === 'wav' ? 'audio/wav' : 'audio/m4a';
        const filename = `tapping_session.${ext}`;

        // React Native FormData requires a specific object structure for files
        // @ts-ignore - React Native specific type
        formData.append('audio', {
            uri: request.audioUri,
            name: filename,
            type: mimeType,
        });

        formData.append('taps', JSON.stringify(request.taps));
        formData.append('targetWord', request.targetWord);
        formData.append('syllables', JSON.stringify(request.syllables));

        const analyzeUrl = getAnalyzeUrl('tapping'); // Ensure this helper handles 'tapping' -> '/analyze/tapping'

        const result = await fetch(analyzeUrl, {
            method: 'POST',
            body: formData,
        });

        if (!result.ok) {
            const errorText = await result.text();
            console.error(`❌ Backend error ${result.status}: ${errorText}`);
            throw new Error(`Backend returned ${result.status}: ${result.statusText}`);
        }

        const data = await result.json();
        return {
            accuracy: data.accuracy ?? 0,
            feedback: data.feedback || 'Practice makes perfect!',
            transcript: data.transcript,
            is_sync: data.is_sync ?? false,
            fluent: data.fluent ?? false,
            syllable_matches: data.syllable_matches ?? []
        };

    } catch (error) {
        console.error('Failed to analyze tapping session:', error);
        throw error;
    }
}
