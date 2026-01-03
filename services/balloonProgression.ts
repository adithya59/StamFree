/**
 * Balloon Game Progression Logic
 * Tier scaffolding and pass/fail criteria for Balloon (Easy Onset)
 */

/**
 * Pass/fail criteria:
 * - Hard attack (delta > 0.6 in 50ms window) → fail (pop)
 * - Soft onset (inflation reaches 1.0 with slope <= maxAttackSlope) → pass
 */
export function evaluateBalloonPass(
  onsetSlope: number,
  maxAttackSlope: number,
  inflationLevel: number
): boolean {
  return inflationLevel >= 1.0 && onsetSlope <= maxAttackSlope;
}

/**
 * Tier definitions:
 * - Tier 1: Vowels (e.g., "Apple")
 * - Tier 2: Plosives (P, B, T, D)
 * - Tier 3: Phrases starting with vowels
 */
export function getTierForBalloon(phonemeCode: string, syllables: number): 1 | 2 | 3 {
  const vowels = ['AA', 'AE', 'IY', 'OW', 'UW', 'A', 'E', 'I', 'O', 'U'];
  const plosives = ['P', 'B', 'T', 'D', 'K', 'G'];
  
  if (vowels.includes(phonemeCode)) return 1;
  if (plosives.includes(phonemeCode)) return 2;
  return 3; // phrases
}
