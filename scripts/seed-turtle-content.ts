/**
 * Turtle Content Seed Script
 * 
 * Specifically for the Turtle Woods Adventure game.
 * Target WPM: 80 - 120 WPM
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

if (!serviceAccount) {
    throw new Error("Service account credentials not found. Ensure server/credentials.json exists.");
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

interface TurtleContentItem {
  id: string;
  text: string;
  wordCount: number;
  tier: 1 | 2 | 3;
  category: 'daily' | 'animals' | 'school' | 'nature';
  chunkedText: string; 
  createdAt: string;
}

const turtlePool: Omit<TurtleContentItem, 'createdAt'>[] = [
  // TIER 1: Short Phrases (3-5 words)
  { id: 't1_icecream', text: 'I like ice cream', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'I like ice cream' },
  { id: 't1_sun', text: 'The sun is hot', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'The sun is hot' },
  { id: 't1_dog', text: 'My dog runs fast', wordCount: 4, tier: 1, category: 'animals', chunkedText: 'My dog runs fast' },
  { id: 't1_shoes', text: 'My shoes are blue', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'My shoes are blue' },
  { id: 't1_fish', text: 'Look at the fish', wordCount: 4, tier: 1, category: 'animals', chunkedText: 'Look at the fish' },
  { id: 't1_ball', text: 'Kick the red ball', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'Kick the red ball' },

  // TIER 2: Medium Sentences (6-9 words)
  { id: 't2_school', text: 'I put my books in my bag', wordCount: 7, tier: 2, category: 'school', chunkedText: 'I put my books | in my bag' },
  { id: 't2_milk', text: 'Can I have a glass of milk?', wordCount: 7, tier: 2, category: 'daily', chunkedText: 'Can I have | a glass of milk?' },
  { id: 't2_bird', text: 'I see a blue bird in the tree', wordCount: 8, tier: 2, category: 'nature', chunkedText: 'I see a blue bird | in the tree' },
  { id: 't2_bus', text: 'The yellow bus is waiting for me', wordCount: 7, tier: 2, category: 'school', chunkedText: 'The yellow bus | is waiting for me' },
  { id: 't2_rain', text: 'We play inside when it rains outside', wordCount: 7, tier: 2, category: 'nature', chunkedText: 'We play inside | when it rains outside' },
  { id: 't2_pizza', text: 'We are having pizza for dinner tonight', wordCount: 7, tier: 2, category: 'daily', chunkedText: 'We are having pizza | for dinner tonight' },

  // TIER 3: Long Sentences (10+ words)
  { id: 't3_morning', text: 'When I wake up I brush my teeth and wash my face', wordCount: 12, tier: 3, category: 'daily', chunkedText: 'When I wake up | I brush my teeth | and wash my face' },
  { id: 't3_turtle', text: 'The turtle walks slowly because he has a very heavy shell', wordCount: 11, tier: 3, category: 'animals', chunkedText: 'The turtle walks slowly | because he has | a very heavy shell' },
  { id: 't3_park', text: 'After school we go to the park to play on the slide', wordCount: 12, tier: 3, category: 'school', chunkedText: 'After school | we go to the park | to play on the slide' },
  { id: 't3_zoo', text: 'The giraffe has a long neck to eat leaves from high trees', wordCount: 12, tier: 3, category: 'animals', chunkedText: 'The giraffe has a long neck | to eat leaves | from high trees' }
];

async function seedTurtleContent() {
  console.log('🐢 Seeding Turtle Content Pool...');
  const batch = db.batch();
  const timestamp = new Date().toISOString();
  
  for (const item of turtlePool) {
    const ref = db.collection('turtle_content_pool').doc(item.id);
    batch.set(ref, { ...item, createdAt: timestamp });
  }
  
  await batch.commit();
  console.log(`✅ Successfully seeded ${turtlePool.length} items to turtle_content_pool`);
}

seedTurtleContent().catch(console.error);
