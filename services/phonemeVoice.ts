/**
 * Phoneme Voice Helper
 * 
 * Converts phoneme examples to naturally speakable prompts for TTS.
 * This prevents "Nnnnn" from being read as "N-N-N-N-N" by converting
 * to more natural utterances like "Nun", "Mum", etc.
 */

/**
 * Map of repeated-letter phoneme examples to naturally speakable alternatives
 * Used to ensure TTS pronounces phonemes correctly instead of spelling them
 */
const phonemeVoiceMap: Record<string, string> = {
  // Nasals
  'Mmmmm': 'Mum',
  'Nnnnn': 'Nun',
  
  // Liquids
  'Lllll': 'Lull',
  'Rrrrr': 'Roar',
  
  // Glides
  'Wwwww': 'Wow',
  'Yyyyy': 'Yes',
  
  // Vowels
  'Aaaaa': 'Ah',
  'Eeeee': 'Eek',
  'Ooooo': 'Ooze',
  
  // Fricatives & Sibilants
  'Sssss': 'Sue',
  'Zzzzz': 'Zoo',
  'Fffff': 'Foo',
  'Vvvvv': 'Vow',
  'Shhhh': 'Shh',
  'Thhhh': 'Thud',
  'Hhhhh': 'Huh',
};

/**
 * Get the voice-friendly version of a phoneme example
 * If the example is a repeated letter pattern, convert it to a natural word
 * Otherwise, return the example as-is
 */
export function getPhonemeVoicePrompt(example: string): string {
  return phonemeVoiceMap[example] || example;
}

/**
 * Check if a phoneme example needs voice conversion
 */
export function needsVoiceConversion(example: string): boolean {
  return example in phonemeVoiceMap;
}
