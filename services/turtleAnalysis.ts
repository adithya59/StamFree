import { getAnalyzeUrl } from '@/config/backend';
import { createFormData, uploadAudioWithTimeout, type UploadResult } from '@/services/audio';
import { normalizeTurtle, type TurtleResponse, type UnifiedResult } from '@/services/clinicalLogic';

export interface TurtleAnalysisResult extends UnifiedResult {
  wpm: number;
}

/**
 * Send audio to Flask backend for Turtle analysis (WPM & Fluency)
 */
export async function analyzeTurtleAudio(
  audioUri: string,
  targetText?: string
): Promise<TurtleAnalysisResult | null> {
  try {
    const formData = createFormData(audioUri);
    if (targetText) {
        formData.append('targetText', targetText);
    }

    const url = getAnalyzeUrl('turtle');
    const result: UploadResult = await uploadAudioWithTimeout(url, formData, 15000); // 15s timeout for STT

    if (!result.ok || !result.json) {
      console.error('[TurtleAnalysis] Upload failed:', result.error);
      return null;
    }

    const turtleRes = result.json as TurtleResponse;
    console.log('[TurtleAnalysis] Backend result:', turtleRes);
    const unified = normalizeTurtle(turtleRes);

    return {
      ...unified,
      wpm: turtleRes.wpm,
    };
  } catch (error) {
    console.error('[TurtleAnalysis] Error:', error);
    return null;
  }
}
