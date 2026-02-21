export type RateStatus = 'too_fast' | 'too_slow' | 'perfect';

export interface RateResult {
  wpm: number;
  status: RateStatus;
  feedback: string;
}

// Define the WPM ranges for each tier
const TIER_RANGES = {
  1: { min: 40, max: 70, name: 'Jungle' },   // Very slow, control
  2: { min: 60, max: 90, name: 'River' },    // Slow + smooth
  3: { min: 80, max: 110, name: 'Mountain' } // Near-normal, controlled
};

/**
 * Calculates the speaking rate and returns a status based on therapeutic targets.
 * 
 * Tier 1 (Jungle): 40–70 WPM
 * Tier 2 (River): 60–90 WPM
 * Tier 3 (Mountain): 80–110 WPM
 */
export function calculateSpeakingRate(
  wordCount: number,
  durationMs: number,
  tier: number = 1 // Default to Tier 1 if not specified
): RateResult {
  // 1. Convert duration to minutes
  const durationMin = durationMs / 1000 / 60;

  // 2. Calculate WPM
  if (durationMin < 0.005) { // Guard against extremely short clips (<0.3s)
    return { wpm: 0, status: 'too_fast', feedback: 'Too short! Try saying the whole thing. 🐢' };
  }

  const wpm = Math.round(wordCount / durationMin);

  // 3. Get tier constraints (fallback to Tier 1 if invalid tier passed)
  const range = TIER_RANGES[tier as keyof typeof TIER_RANGES] || TIER_RANGES[1];

  // 4. Determine Status based on Tier
  if (wpm > range.max) {
    return {
      wpm,
      status: 'too_fast',
      feedback: `Whoa! Too fast for the ${range.name}! Aim for ${range.min}-${range.max} WPM. 🐢`
    };
  } else if (wpm < range.min) {
    return {
      wpm,
      status: 'too_slow',
      feedback: `A bit too sleepy for the ${range.name}! Wake up! 💤`
    };
  } else {
    return {
      wpm,
      status: 'perfect',
      feedback: `Perfect ${range.name} pace! Watch me go! 🌟`
    };
  }
}
