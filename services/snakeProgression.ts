/**
 * Snake Progression Helpers
 * 
 * Cleaned up version: Contains only logic relevant to the new Playlist architecture.
 * Legacy Level/Tier logic has been removed.
 */

/**
 * Get instruction text for a phoneme
 * Updated to support Class-based logic (Fricatives, Liquids, Glides, Stops)
 * 
 * @param phoneme - The target phoneme (e.g., "M", "S", "Y")
 * @param tier - Difficulty tier (1=Flow, 2=Friction)
 * @param category - Category from pool (flow/friction)
 */
export function getInstructionText(phoneme: string, tier: number, category: string): string {
  const p = phoneme.toUpperCase();
  
  // Helper to create prolonged sound notation for TTS
  const prolonged = (sound: string) => `${sound.toLowerCase().repeat(5)}`;

  // 1. Vowels (The Openers) - Pure Prolongation
  // These are loud and clear. Keep them as is.
  if (['A', 'E', 'I', 'O', 'U', 'AA', 'EE', 'OO'].includes(p)) {
    return `Open wide and sing: ${prolonged(p)}`;
  }

  // 2. Strong Nasals (The Hummers) - M, N
  // These are loud enough to be picked up as a "Hum".
  if (['M', 'N'].includes(p)) {
    return `Hum steadily through your nose: ${prolonged(p)}`;
  }

  // 3. Strong Hissers - S, Z, SH
  // High frequency cuts through noise cancellation well.
  if (['S', 'SH'].includes(p)) {
     return `Make a long snake sound: ${prolonged(p)}`;
  }
  if (['Z'].includes(p)) {
     return `Buzz like a bee: ${prolonged(p)}`;
  }

  // 4. The "Mic-Sensitive" Sounds (Fricatives/Liquids/Glides) - V, F, TH, L, R, W, Y
  // PROBLEM: Alone, these are too quiet or sound like background noise.
  // SOLUTION: Anchor them with "Ah".
  
  if (['V', 'F'].includes(p)) {
    return `Bite your lip and slide to ah: ${p.toLowerCase()}-aaaa`;
  }

  if (['TH'].includes(p)) {
    return `Tongue between teeth, then slide: ${p.toLowerCase()}-aaaa`;
  }

  if (['L'].includes(p)) {
    return `Lift your tongue, then sing: laaaa`;
  }
  
  if (['R'].includes(p)) {
    return `Growl like a pirate, then open: raaaa`;
  }

  if (['W', 'Y'].includes(p)) {
    return `Slide gently into ah: ${p.toLowerCase()}-aaaa`;
  }

  // 5. Default Fallback
  return `Say the sound and slide to ah: ${p.toLowerCase()}-aaaa`;
}

/**
 * Calculate XP reward based on performance
 * Kept as a utility for potentially calculating XP for other game modes or UI display
 */
export function calculateXpReward(
  baseXp: number,
  starsAwarded: number,
  completionPercentage: number
): number {
  let multiplier = 1.0;

  // Star bonus
  if (starsAwarded === 3) {
    multiplier += 0.5; // 50% bonus for 3 stars
  } else if (starsAwarded === 2) {
    multiplier += 0.25; // 25% bonus for 2 stars
  }
  // 1 star = no bonus

  // Completion bonus (if applicable)
  if (completionPercentage >= 100) {
    multiplier += 0.1; // 10% bonus for 100% completion
  }

  return Math.round(baseXp * multiplier);
}