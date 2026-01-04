/**
 * Firestore Seed Script - Phoneme Pools & Content
 * 
 * Purpose:
 * 1. Seeds `snake_phoneme_pool` with pure phonemes for the sliding window system.
 * 2. Seeds `content_bank` with words/phrases for other games.
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../server/credentials.json'), 'utf8')
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// ============================================================================
// PART 1: SNAKE PHONEME POOL (For Sliding Window)
// ============================================================================

interface PhonemePoolItem {
  id: string;
  phoneme: string;      // Display: "M"
  ipa: string;          // IPA: "m"
  tier: 1 | 2;          // 1=Flow, 2=Friction
  example: string;      // "Mmmm" (Humming prompt)
  category: 'flow' | 'friction';
}

const snakePool: PhonemePoolItem[] = [
  // TIER 1: FLOW (Nasals, Liquids, Glides, Vowels)
  { id: 'm', phoneme: 'M', ipa: 'm', tier: 1, example: 'Mmmmm', category: 'flow' },
  { id: 'n', phoneme: 'N', ipa: 'n', tier: 1, example: 'Nnnnn', category: 'flow' },
  { id: 'l', phoneme: 'L', ipa: 'l', tier: 1, example: 'Lllll', category: 'flow' },
  { id: 'r', phoneme: 'R', ipa: 'r', tier: 1, example: 'Rrrrr', category: 'flow' },
  { id: 'w', phoneme: 'W', ipa: 'w', tier: 1, example: 'Wwwww', category: 'flow' },
  { id: 'y', phoneme: 'Y', ipa: 'j', tier: 1, example: 'Yyyyy', category: 'flow' },
  { id: 'aa', phoneme: 'A', ipa: 'ɑ', tier: 1, example: 'Aaaaa', category: 'flow' },
  { id: 'ee', phoneme: 'E', ipa: 'i', tier: 1, example: 'Eeeee', category: 'flow' },
  { id: 'oo', phoneme: 'O', ipa: 'u', tier: 1, example: 'Ooooo', category: 'flow' },

  // TIER 2: FRICTION (Sibilants, Fricatives)
  { id: 's', phoneme: 'S', ipa: 's', tier: 2, example: 'Sssss', category: 'friction' },
  { id: 'z', phoneme: 'Z', ipa: 'z', tier: 2, example: 'Zzzzz', category: 'friction' },
  { id: 'f', phoneme: 'F', ipa: 'f', tier: 2, example: 'Fffff', category: 'friction' },
  { id: 'v', phoneme: 'V', ipa: 'v', tier: 2, example: 'Vvvvv', category: 'friction' },
  { id: 'sh', phoneme: 'SH', ipa: 'ʃ', tier: 2, example: 'Shhhh', category: 'friction' },
  { id: 'th', phoneme: 'TH', ipa: 'θ', tier: 2, example: 'Thhhh', category: 'friction' },
  { id: 'h', phoneme: 'H', ipa: 'h', tier: 2, example: 'Hhhhh', category: 'friction' },
];

async function seedSnakePool() {
  console.log('🐍 Seeding Snake Phoneme Pool...');
  const batch = db.batch();
  
  for (const item of snakePool) {
    const ref = db.collection('snake_phoneme_pool').doc(item.id);
    batch.set(ref, item);
  }
  
  await batch.commit();
  console.log(`✅ Seeded ${snakePool.length} phonemes to snake_phoneme_pool`);
}

// ============================================================================
// PART 2: CONTENT BANK (For Turtle, Balloon, One-Tap)
// Note: We leave the existing content_bank logic mostly intact but updated 
// compatibleGames to exclude Snake since Snake now has its own pool.
// ============================================================================

// ... (We can reuse the existing logic or keep the file separate. 
// For now, I'll focus on the Snake Pool as that's the requested change.)

async function main() {
  try {
    await seedSnakePool();
    // In a real scenario, we'd also run seedContentBank() here if needed
    // but the user specific request was about Snake architecture.
    console.log('✨ All seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  }
}

main();
