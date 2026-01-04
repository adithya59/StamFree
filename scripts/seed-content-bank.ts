/**
 * Content Bank Seed Script
 * 
 * Populates Firestore `content_bank` collection with speech therapy content
 * shared across multiple games (Snake, Turtle, Balloon, One-Tap).
 * 
 * Architecture: "One Word, Many Games" - Each content item is tagged with
 * compatibleGames array to indicate which exercises can use it.
 * 
 * Compatibility Rules:
 * - Turtle (slow speech): ALL content (any phoneme can be slowed)
 * - Snake (prolongation): Tier 1 (vowels/glides) + Tier 2 (fricatives) ONLY
 * - Balloon (soft onset): Tier 3 (stops) + vowel contexts
 * - One-Tap (rhythm): Multi-syllable content preferred (syllables >= 2)
 * 
 * Related: FR-009, Clarifications 2025-12-24
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
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

/**
 * Content Bank Item Interface
 * Matches ContentBankItem entity from spec
 */
interface ContentBankItem {
  id: string;
  text: string;
  phoneme: string; // Display name (e.g., "M", "S", "A")
  phonemeCode: string; // IPA or technical code (e.g., "M", "S", "AA")
  tier: 1 | 2 | 3; // 1=Flow, 2=Friction, 3=Stops
  type: 'word' | 'phrase' | 'sentence';
  syllables: number;
  compatibleGames: ('snake' | 'turtle' | 'balloon' | 'onetap')[];
  ipa?: string; // Optional IPA transcription
  category?: 'daily' | 'animals' | 'school' | 'nature';
  chunkedText?: string;
  createdAt: string;
}

// ... helper function remains same ...

/**
 * Master content database organized by tier
 */
const contentDatabase: Omit<ContentBankItem, 'id' | 'compatibleGames' | 'createdAt'>[] = [
  // ============================================================================
  // TURTLE CONTENT: RATE CONTROL (80-120 WPM)
  // ============================================================================

  // TIER 1: Short Phrases (3-5 words)
  { text: 'I like ice cream', phoneme: 'I', phonemeCode: 'AY', tier: 1, type: 'phrase', syllables: 4, category: 'daily', chunkedText: 'I like ice cream' },
  { text: 'The sun is hot', phoneme: 'S', phonemeCode: 'S', tier: 1, type: 'phrase', syllables: 4, category: 'nature', chunkedText: 'The sun is hot' },
  { text: 'My dog runs fast', phoneme: 'D', phonemeCode: 'D', tier: 1, type: 'phrase', syllables: 4, category: 'animals', chunkedText: 'My dog runs fast' },
  { text: 'My shoes are blue', phoneme: 'SH', phonemeCode: 'SH', tier: 1, type: 'phrase', syllables: 4, category: 'daily', chunkedText: 'My shoes are blue' },
  { text: 'Look at the fish', phoneme: 'L', phonemeCode: 'L', tier: 1, type: 'phrase', syllables: 4, category: 'animals', chunkedText: 'Look at the fish' },
  { text: 'Kick the red ball', phoneme: 'K', phonemeCode: 'K', tier: 1, type: 'phrase', syllables: 4, category: 'daily', chunkedText: 'Kick the red ball' },

  // TIER 2: Medium Sentences (6-9 words)
  { text: 'I put my books in my bag', phoneme: 'B', phonemeCode: 'B', tier: 2, type: 'sentence', syllables: 7, category: 'school', chunkedText: 'I put my books | in my bag' },
  { text: 'Can I have a glass of milk?', phoneme: 'M', phonemeCode: 'M', tier: 2, type: 'sentence', syllables: 7, category: 'daily', chunkedText: 'Can I have | a glass of milk?' },
  { text: 'I see a blue bird in the tree', phoneme: 'B', phonemeCode: 'B', tier: 2, type: 'sentence', syllables: 8, category: 'nature', chunkedText: 'I see a blue bird | in the tree' },
  { text: 'The yellow bus is waiting for me', phoneme: 'B', phonemeCode: 'B', tier: 2, type: 'sentence', syllables: 7, category: 'school', chunkedText: 'The yellow bus | is waiting for me' },
  { text: 'We play inside when it rains outside', phoneme: 'P', phonemeCode: 'P', tier: 2, type: 'sentence', syllables: 7, category: 'nature', chunkedText: 'We play inside | when it rains outside' },
  { text: 'We are having pizza for dinner tonight', phoneme: 'P', phonemeCode: 'P', tier: 2, type: 'sentence', syllables: 7, category: 'daily', chunkedText: 'We are having pizza | for dinner tonight' },

  // TIER 3: Long Sentences (10+ words)
  { text: 'When I wake up I brush my teeth and wash my face', phoneme: 'W', phonemeCode: 'W', tier: 3, type: 'sentence', syllables: 12, category: 'daily', chunkedText: 'When I wake up | I brush my teeth | and wash my face' },
  { text: 'The turtle walks slowly because he has a very heavy shell', phoneme: 'T', phonemeCode: 'T', tier: 3, type: 'sentence', syllables: 11, category: 'animals', chunkedText: 'The turtle walks slowly | because he has | a very heavy shell' },
  { text: 'After school we go to the park to play on the slide', phoneme: 'S', phonemeCode: 'S', tier: 3, type: 'sentence', syllables: 12, category: 'school', chunkedText: 'After school | we go to the park | to play on the slide' },
  { text: 'The giraffe has a long neck to eat leaves from high trees', phoneme: 'G', phonemeCode: 'G', tier: 3, type: 'sentence', syllables: 12, category: 'animals', chunkedText: 'The giraffe has a long neck | to eat leaves | from high trees' },

  // ============================================================================
  // TIER 1: FLOW SOUNDS (Existing)
  // ============================================================================
  // M words
  { text: 'Moon', phoneme: 'M', phonemeCode: 'M', tier: 1, type: 'word', syllables: 1 },
  { text: 'Mama', phoneme: 'M', phonemeCode: 'M', tier: 1, type: 'word', syllables: 2 },
  { text: 'Money', phoneme: 'M', phonemeCode: 'M', tier: 1, type: 'word', syllables: 2 },
  // ... existing items continue here (keeping the ones that are words/fricatives for other games) ...
]

/**
 * Seed the content_bank collection
 */
async function seedContentBank() {
  console.log('🌱 Starting content bank seed...\n');

  const batch = db.batch();
  const timestamp = new Date().toISOString();
  let count = 0;
  const snakeTierTypeCounts: Record<string, number> = {
    '1_word': 0,
    '1_phrase': 0,
    '1_sentence': 0,
    '2_word': 0,
    '2_phrase': 0,
    '2_sentence': 0,
  };

  for (const item of contentDatabase) {
    // Generate unique ID
    const id = `${item.tier}_${item.type}_${item.phonemeCode}_${item.text.toLowerCase().replace(/\s+/g, '_')}`;

    // Calculate compatible games
    const compatibleGames = getCompatibleGames(item.tier, item.phonemeCode, item.syllables);

    // Guard: Snake should never include Tier 3 stops
    if (item.tier === 3 && compatibleGames.includes('snake')) {
      throw new Error(`Invalid snake compatibility for tier 3 item: ${id}`);
    }

    // Track snake coverage by tier/type for reporting
    if (compatibleGames.includes('snake')) {
      const key = `${item.tier}_${item.type}`;
      if (snakeTierTypeCounts[key] !== undefined) {
        snakeTierTypeCounts[key]++;
      }
    }

    // Create full document
    const doc: ContentBankItem = {
      ...item,
      id,
      compatibleGames,
      createdAt: timestamp,
    };

    // Add to batch
    const docRef = db.collection('content_bank').doc(id);
    batch.set(docRef, doc);
    count++;

    // Log progress
    const games = compatibleGames.join(', ');
    console.log(`✓ ${doc.text.padEnd(30)} | Tier ${doc.tier} | ${doc.type.padEnd(8)} | ${games}`);
  }

  // Commit batch
  await batch.commit();

  console.log(`\n✅ Successfully seeded ${count} items to content_bank collection`);

  // Print summary statistics
  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  const typeCounts = { word: 0, phrase: 0, sentence: 0 };
  const snakeCompatible = contentDatabase.filter((item) => {
    tierCounts[item.tier]++;
    typeCounts[item.type]++;
    return item.tier === 1 || item.tier === 2;
  }).length;

  console.log('\n📊 Summary:');
  console.log(`   Total items: ${count}`);
  console.log(`   Tier 1 (Flow): ${tierCounts[1]}`);
  console.log(`   Tier 2 (Friction): ${tierCounts[2]}`);
  console.log(`   Tier 3 (Stops): ${tierCounts[3]}`);
  console.log(`   Words: ${typeCounts.word}`);
  console.log(`   Phrases: ${typeCounts.phrase}`);
  console.log(`   Sentences: ${typeCounts.sentence}`);
  console.log(`   Snake-compatible: ${snakeCompatible} (Tier 1+2 only)`);
  console.log('   Snake coverage by tier/type (should exclude tier 3):');
  console.log(`     T1 word: ${snakeTierTypeCounts['1_word']}, phrase: ${snakeTierTypeCounts['1_phrase']}, sentence: ${snakeTierTypeCounts['1_sentence']}`);
  console.log(`     T2 word: ${snakeTierTypeCounts['2_word']}, phrase: ${snakeTierTypeCounts['2_phrase']}, sentence: ${snakeTierTypeCounts['2_sentence']}`);
}

/**
 * Example query function to demonstrate filtering
 */
async function exampleSnakeQuery() {
  console.log('\n🐍 Example Snake Query (Tier 1, Word):');

  const snapshot = await db
    .collection('content_bank')
    .where('compatibleGames', 'array-contains', 'snake')
    .where('tier', '==', 1)
    .where('type', '==', 'word')
    .limit(5)
    .get();

  snapshot.forEach((doc) => {
    const data = doc.data() as ContentBankItem;
    console.log(`   "${data.text}" - ${data.phoneme} (${data.syllables} syllables)`);
  });
}

// Run the seed script
seedContentBank()
  .then(() => exampleSnakeQuery())
  .then(() => {
    console.log('\n✨ Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
