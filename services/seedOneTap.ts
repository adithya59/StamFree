/**
 * One-Tap Content Seeding
 * Syllable-based words and sentences for impulse control and motor planning
 * Tier system:
 * - Tier 1: Common Words (2-3 syllables)
 * - Tier 2: Short Sentences (3-5 syllables)
 * - Tier 3: Complex Sentences (6+ syllables)
 */

export interface OneTapContentItem {
  id: string;
  text: string;
  syllables: string[];
  tier: 1 | 2 | 3;
  category: 'animals' | 'food' | 'objects' | 'places' | 'actions' | 'sentences';
  ipa?: string;
  imageKeyword?: string; // Optional override for asset search
  ttsSyllables?: string[]; // Optional phonetic syllables for TTS
}

export const oneTapPool: OneTapContentItem[] = [
  // --- TIER 1: Common Words (4 Items) ---
  {
    id: 'monkey',
    text: 'Monkey',
    syllables: ['Mon', 'key'],
    tier: 1,
    category: 'animals',
    ipa: 'ˈmʌŋki'
  },
  {
    id: 'apple',
    text: 'Apple',
    syllables: ['Ap', 'ple'],
    tier: 1,
    category: 'food',
    ipa: 'ˈæpəl'
  },
  {
    id: 'water',
    text: 'Water',
    syllables: ['Wa', 'ter'],
    tier: 1,
    category: 'food',
    ipa: 'ˈwɔːtər'
  },
  {
    id: 'happy',
    text: 'Happy',
    syllables: ['Hap', 'py'],
    tier: 1,
    category: 'actions',
    ipa: 'ˈhæpi'
  },

  // --- TIER 2: Short Sentences (8 Items) ---
  {
    id: 'i-like-it',
    text: 'I like it',
    syllables: ['I', 'like', 'it'],
    tier: 2,
    category: 'sentences',
    ipa: 'aɪ laɪk ɪt'
  },
  {
    id: 'see-the-dog',
    text: 'See the dog',
    syllables: ['See', 'the', 'dog'],
    tier: 2,
    category: 'sentences',
    ipa: 'si ðə dɔɡ'
  },
  {
    id: 'red-big-ball',
    text: 'Red big ball',
    syllables: ['Red', 'big', 'ball'],
    tier: 2,
    category: 'sentences',
    ipa: 'rɛd bɪɡ bɔl'
  },
  {
    id: 'time-to-go',
    text: 'Time to go',
    syllables: ['Time', 'to', 'go'],
    tier: 2,
    category: 'sentences',
    ipa: 'taɪm tu ɡoʊ'
  },
  {
    id: 'open-the-door',
    text: 'Open the door',
    syllables: ['O', 'pen', 'the', 'door'],
    tier: 2,
    category: 'sentences',
    ipa: 'ˈoʊpən ðə dɔr'
  },
  {
    id: 'hello-my-friend',
    text: 'Hello my friend',
    syllables: ['Hel', 'lo', 'my', 'friend'],
    tier: 2,
    category: 'sentences',
    ipa: 'hɛˈloʊ maɪ frɛnd'
  },
  {
    id: 'look-at-that',
    text: 'Look at that',
    syllables: ['Look', 'at', 'that'],
    tier: 2,
    category: 'sentences',
    ipa: 'lʊk æt ðæt'
  },
  {
    id: 'sun-is-hot',
    text: 'Sun is hot',
    syllables: ['Sun', 'is', 'hot'],
    tier: 2,
    category: 'sentences',
    ipa: 'sʌn ɪz hɑt'
  },

  // --- TIER 3: Complex Sentences (12 Items) ---
  {
    id: 'the-sun-is-shining',
    text: 'The sun is shining',
    syllables: ['The', 'sun', 'is', 'shi', 'ning'],
    tier: 3,
    category: 'sentences',
    ipa: 'ðə sʌn ɪz ˈʃaɪnɪŋ'
  },
  {
    id: 'we-play-in-the-park',
    text: 'We play in the park',
    syllables: ['We', 'play', 'in', 'the', 'park'],
    tier: 3,
    category: 'sentences',
    ipa: 'wi pleɪ ɪn ðə pɑrk'
  },
  {
    id: 'can-we-go-outside',
    text: 'Can we go outside',
    syllables: ['Can', 'we', 'go', 'out', 'side'],
    tier: 3,
    category: 'sentences',
    ipa: 'kæn wi ɡoʊ ˌaʊtˈsaɪd'
  },
  {
    id: 'birds-fly-in-the-sky',
    text: 'Birds fly in the sky',
    syllables: ['Birds', 'fly', 'in', 'the', 'sky'],
    tier: 3,
    category: 'sentences',
    ipa: 'bɜrdz flaɪ ɪn ðə skaɪ'
  },
  {
    id: 'i-want-apple-juice',
    text: 'I want apple juice',
    syllables: ['I', 'want', 'ap', 'ple', 'juice'],
    tier: 3,
    category: 'sentences',
    ipa: 'aɪ wɑnt ˈæpəl dʒus'
  },
  {
    id: 'where-is-my-blue-shoe',
    text: 'Where is my blue shoe',
    syllables: ['Where', 'is', 'my', 'blue', 'shoe'],
    tier: 3,
    category: 'sentences',
    ipa: 'wɛr ɪz maɪ blu ʃu'
  },
  {
    id: 'reading-is-really-fun',
    text: 'Reading is really fun',
    syllables: ['Read', 'ing', 'is', 'real', 'ly', 'fun'],
    tier: 3,
    category: 'sentences',
    ipa: 'ˈridɪŋ ɪz ˈrɪəli fʌn'
  },
  {
    id: 'the-cat-sleeps-all-day',
    text: 'The cat sleeps all day',
    syllables: ['The', 'cat', 'sleeps', 'all', 'day'],
    tier: 3,
    category: 'sentences',
    ipa: 'ðə kæt slips ɔl deɪ'
  },
  {
    id: 'let-us-bake-some-cake',
    text: 'Let us bake some cake',
    syllables: ['Let', 'us', 'bake', 'some', 'cake'],
    tier: 3,
    category: 'sentences',
    ipa: 'lɛt ʌs beɪk sʌm keɪk'
  },
  {
    id: 'my-bag-is-very-heavy',
    text: 'My bag is very heavy',
    syllables: ['My', 'bag', 'is', 'ver', 'y', 'heav', 'y'],
    tier: 3,
    category: 'sentences',
    ipa: 'maɪ bæɡ ɪz ˈvɛri ˈhɛvi'
  },
  {
    id: 'today-is-a-good-day',
    text: 'Today is a good day',
    syllables: ['To', 'day', 'is', 'a', 'good', 'day'],
    tier: 3,
    category: 'sentences',
    ipa: 'təˈdeɪ ɪz ə ɡʊd deɪ'
  },
  {
    id: 'please-pass-the-water',
    text: 'Please pass the water',
    syllables: ['Please', 'pass', 'the', 'wa', 'ter'],
    tier: 3,
    category: 'sentences',
    ipa: 'pliz pæs ðə ˈwɔtər'
  }
];

/**
 * Get random word from specific tier
 */
export function getOneTapWordByTier(tier: 1 | 2 | 3): OneTapContentItem {
  const pool = oneTapPool.filter(item => item.tier === tier);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Get random word from specific category
 */
export function getOneTapWordByCategory(category: string): OneTapContentItem {
  const pool = oneTapPool.filter(item => item.category === category);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Calculate expected duration for word (rough estimate: 0.4s per syllable)
 */
export function getExpectedDuration(syllables: number): number {
  return syllables * 0.4; // e.g., 3 syllables ≈ 1.2s
}

/**
 * Check if duration is within acceptable range
 */
export function isDurationValid(duration: number, syllables: number): boolean {
  const expected = getExpectedDuration(syllables);
  const minDuration = expected * 0.5; // Too fast (cut off)
  const maxDuration = expected * 2.5; // Too slow (struggle/repetition)
  return duration >= minDuration && duration <= maxDuration;
}
