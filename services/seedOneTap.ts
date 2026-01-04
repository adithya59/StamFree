/**
 * One-Tap Content Seeding
 * Syllable-based words for impulse control and motor planning
 * Tier system: 2-syl (Tier 1), 3-syl (Tier 2), 4+ syl (Tier 3)
 */

export interface OneTapContentItem {
  id: string;
  text: string;
  syllables: string[];
  tier: 1 | 2 | 3;
  category: 'animals' | 'food' | 'objects' | 'places' | 'actions';
  ipa?: string;
  imageKeyword?: string; // Optional override for asset search (e.g., "Baby Boy" instead of "Baby")
}

export const oneTapPool: OneTapContentItem[] = [
  // TIER 1: The Two-Step (2 Syllables)
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
    id: 'tiger', 
    text: 'Tiger', 
    syllables: ['Ti', 'ger'], 
    tier: 1, 
    category: 'animals',
    ipa: 'ˈtaɪɡər' 
  },
  { 
    id: 'baby', 
    text: 'Baby', 
    syllables: ['Ba', 'by'], 
    tier: 1, 
    category: 'objects',
    ipa: 'ˈbeɪbi',
    imageKeyword: 'Baby Face' // Better search term for cute baby illustrations
  },
  { 
    id: 'pizza', 
    text: 'Pizza', 
    syllables: ['Piz', 'za'], 
    tier: 1, 
    category: 'food',
    ipa: 'ˈpiːtsə' 
  },
  { 
    id: 'cookie', 
    text: 'Cookie', 
    syllables: ['Cook', 'ie'], 
    tier: 1, 
    category: 'food',
    ipa: 'ˈkʊki' 
  },
  { 
    id: 'bunny', 
    text: 'Bunny', 
    syllables: ['Bun', 'ny'], 
    tier: 1, 
    category: 'animals',
    ipa: 'ˈbʌni',
    imageKeyword: 'Cute Rabbit'
  },
  { 
    id: 'puppy', 
    text: 'Puppy', 
    syllables: ['Pup', 'py'], 
    tier: 1, 
    category: 'animals',
    ipa: 'ˈpʌpi' 
  },

  // TIER 2: The Tri-Step (3 Syllables)
  { 
    id: 'banana', 
    text: 'Banana', 
    syllables: ['Ba', 'na', 'na'], 
    tier: 2, 
    category: 'food',
    ipa: 'bəˈnænə' 
  },
  { 
    id: 'elephant', 
    text: 'Elephant', 
    syllables: ['El', 'e', 'phant'], 
    tier: 2, 
    category: 'animals',
    ipa: 'ˈɛləfənt' 
  },
  { 
    id: 'butterfly', 
    text: 'Butterfly', 
    syllables: ['But', 'ter', 'fly'], 
    tier: 2, 
    category: 'animals',
    ipa: 'ˈbʌtərflaɪ',
    imageKeyword: 'Colorful Butterfly'
  },
  { 
    id: 'computer', 
    text: 'Computer', 
    syllables: ['Com', 'pu', 'ter'], 
    tier: 2, 
    category: 'objects',
    ipa: 'kəmˈpjuːtər' 
  },
  { 
    id: 'kangaroo', 
    text: 'Kangaroo', 
    syllables: ['Kan', 'ga', 'roo'], 
    tier: 2, 
    category: 'animals',
    ipa: 'ˌkæŋɡəˈruː' 
  },
  { 
    id: 'hamburger', 
    text: 'Hamburger', 
    syllables: ['Ham', 'bur', 'ger'], 
    tier: 2, 
    category: 'food',
    ipa: 'ˈhæmbɜrɡər' 
  },
  { 
    id: 'spaghetti', 
    text: 'Spaghetti', 
    syllables: ['Spa', 'ghet', 'ti'], 
    tier: 2, 
    category: 'food',
    ipa: 'spəˈɡɛti' 
  },
  { 
    id: 'strawberry', 
    text: 'Strawberry', 
    syllables: ['Straw', 'ber', 'ry'], 
    tier: 2, 
    category: 'food',
    ipa: 'ˈstrɔbɛri' 
  },

  // TIER 3: The Complex (4+ Syllables)
  { 
    id: 'watermelon', 
    text: 'Watermelon', 
    syllables: ['Wa', 'ter', 'mel', 'on'], 
    tier: 3, 
    category: 'food',
    ipa: 'ˈwɔtərˌmɛlən' 
  },
  { 
    id: 'caterpillar', 
    text: 'Caterpillar', 
    syllables: ['Cat', 'er', 'pil', 'lar'], 
    tier: 3, 
    category: 'animals',
    ipa: 'ˈkætərˌpɪlər' 
  },
  { 
    id: 'helicopter', 
    text: 'Helicopter', 
    syllables: ['Hel', 'i', 'cop', 'ter'], 
    tier: 3, 
    category: 'objects',
    ipa: 'ˈhɛlɪˌkɑptər' 
  },
  { 
    id: 'alligator', 
    text: 'Alligator', 
    syllables: ['Al', 'li', 'ga', 'tor'], 
    tier: 3, 
    category: 'animals',
    ipa: 'ˈælɪɡeɪtər' 
  },
  { 
    id: 'avocado', 
    text: 'Avocado', 
    syllables: ['Av', 'o', 'ca', 'do'], 
    tier: 3, 
    category: 'food',
    ipa: 'ˌævəˈkɑdoʊ' 
  },
  { 
    id: 'television', 
    text: 'Television', 
    syllables: ['Tel', 'e', 'vi', 'sion'], 
    tier: 3, 
    category: 'objects',
    ipa: 'ˈtɛləˌvɪʒən' 
  },
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
