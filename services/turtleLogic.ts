export type RateStatus = 'too_fast' | 'too_slow' | 'perfect';

export interface RateResult {
  wpm: number;
  status: RateStatus;
  feedback: string;
}

/**
 * Calculates the speaking rate and returns a status based on therapeutic targets.
 * Target: 70 - 130 WPM (Turtle Mode)
 */
export function calculateSpeakingRate(
  wordCount: number, 
  durationMs: number
): RateResult {
  // 1. Convert duration to minutes
  const durationMin = durationMs / 1000 / 60;
  
  // 2. Calculate WPM
  if (durationMin < 0.005) { // Guard against extremely short clips (<0.3s)
    return { wpm: 0, status: 'too_fast', feedback: 'Too short! Try saying the whole thing. 🐢' };
  }
  
  const wpm = Math.round(wordCount / durationMin);

  // 3. Determine Status
  if (wpm > 130) {
    return { 
      wpm, 
      status: 'too_fast', 
      feedback: 'Whoa! Too fast for a Turtle! Try again slower. 🐢' 
    };
  } else if (wpm < 70) {
    return { 
      wpm,
      status: 'too_slow',
      feedback: 'A bit too sleepy! Wake up! 💤'
    };
  } else {
    return { 
      wpm,
      status: 'perfect',
      feedback: 'Perfect turtle pace! Watch me go! 🌟'
    };
  }
}
