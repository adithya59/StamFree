/**
 * CONSOLIDATED SEED SCRIPT - Firestore Content Initialization
 * 
 * This script seeds ALL required content pools for StamFree.
 * Run this ONCE during initial deployment before the app goes live.
 * 
 * Seeds:
 * 1. snake_phoneme_pool (16 phonemes for Snake game, Tiers 1-2)
 * 2. turtle_content_pool (120 sentences for Turtle game, Tiers 1-3)
 * 3. tapping_content_pool (24 words/sentences for Tapping game, Tiers 1-3)
 * 
 * Note: Pass/fail criteria are determined by backend AI analysis, not Firestore config.
 * 
 * Usage: npx ts-node scripts/seed-all-content.ts
 */

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

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

// ============================================================================
// PART 1: SNAKE PHONEME POOL (Tier 1=Flow, Tier 2=Friction)
// ============================================================================

interface PhonemePoolItem {
  id: string;
  phoneme: string;
  ipa: string;
  tier: 1 | 2;
  example: string;
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
  console.log('\n🐍 Seeding Snake Phoneme Pool...');
  const batch = db.batch();

  for (const item of snakePool) {
    const ref = db.collection('snake_phoneme_pool').doc(item.id);
    batch.set(ref, item);
  }

  await batch.commit();
  console.log(`   ✅ Seeded ${snakePool.length} phonemes`);
}

// ============================================================================
// PART 2: TURTLE CONTENT POOL (120 sentences, Tiers 1-3)
// ============================================================================

interface TurtleContentItem {
  id: string;
  text: string;
  wordCount: number;
  tier: 1 | 2 | 3;
  category: 'daily' | 'animals' | 'nature' | 'food' | 'family' | 'play';
  chunkedText: string;
  requiredPauses: number;
  createdAt: string;
}

const turtlePool: Omit<TurtleContentItem, 'createdAt'>[] = [
  // ===== TIER 1: Simple Phrases (3-5 words, NO pauses) - 40 items =====
  // Daily Life
  { id: 't1_ball', text: 'I have a box', wordCount: 4, tier: 1, category: 'play', chunkedText: 'I have a box', requiredPauses: 0 },
  { id: 't1_water', text: 'I drink water', wordCount: 3, tier: 1, category: 'daily', chunkedText: 'I drink water', requiredPauses: 0 },
  { id: 't1_happy', text: 'I am happy', wordCount: 3, tier: 1, category: 'daily', chunkedText: 'I am happy', requiredPauses: 0 },
  { id: 't1_run', text: 'I can run', wordCount: 3, tier: 1, category: 'play', chunkedText: 'I can run', requiredPauses: 0 },
  { id: 't1_smile', text: 'I like to smile', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'I like to smile', requiredPauses: 0 },

  // Animals (simple, universal)
  { id: 't1_cat', text: 'The cat is soft', wordCount: 4, tier: 1, category: 'animals', chunkedText: 'The cat is soft', requiredPauses: 0 },
  { id: 't1_dog', text: 'My dog is big', wordCount: 4, tier: 1, category: 'animals', chunkedText: 'My dog is big', requiredPauses: 0 },
  { id: 't1_bird', text: 'The bird can fly', wordCount: 4, tier: 1, category: 'animals', chunkedText: 'The bird can fly', requiredPauses: 0 },
  { id: 't1_fish', text: 'Fish swim in water', wordCount: 4, tier: 1, category: 'animals', chunkedText: 'Fish swim in water', requiredPauses: 0 },
  { id: 't1_rabbit', text: 'The rabbit is white', wordCount: 4, tier: 1, category: 'animals', chunkedText: 'The rabbit is white', requiredPauses: 0 },

  // Nature
  { id: 't1_sun', text: 'The sun is hot', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'The sun is hot', requiredPauses: 0 },
  { id: 't1_moon', text: 'I see the moon', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'I see the moon', requiredPauses: 0 },
  { id: 't1_tree', text: 'The tree is tall', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'The tree is tall', requiredPauses: 0 },
  { id: 't1_flower', text: 'The flower is red', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'The flower is red', requiredPauses: 0 },
  { id: 't1_rain', text: 'I like the rain', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'I like the rain', requiredPauses: 0 },

  // Food
  { id: 't1_apple', text: 'I eat an apple', wordCount: 4, tier: 1, category: 'food', chunkedText: 'I eat an apple', requiredPauses: 0 },
  { id: 't1_bread', text: 'I like bread', wordCount: 3, tier: 1, category: 'food', chunkedText: 'I like bread', requiredPauses: 0 },
  { id: 't1_milk', text: 'Milk is white', wordCount: 3, tier: 1, category: 'food', chunkedText: 'Milk is white', requiredPauses: 0 },
  { id: 't1_rice', text: 'I eat rice', wordCount: 3, tier: 1, category: 'food', chunkedText: 'I eat rice', requiredPauses: 0 },
  { id: 't1_banana', text: 'The banana is yellow', wordCount: 4, tier: 1, category: 'food', chunkedText: 'The banana is yellow', requiredPauses: 0 },

  // Family
  { id: 't1_mom', text: 'I love my mom', wordCount: 4, tier: 1, category: 'family', chunkedText: 'I love my mom', requiredPauses: 0 },
  { id: 't1_dad', text: 'My dad is tall', wordCount: 4, tier: 1, category: 'family', chunkedText: 'My dad is tall', requiredPauses: 0 },
  { id: 't1_baby', text: 'The baby is small', wordCount: 4, tier: 1, category: 'family', chunkedText: 'The baby is small', requiredPauses: 0 },
  { id: 't1_friend', text: 'I have a friend', wordCount: 4, tier: 1, category: 'family', chunkedText: 'I have a friend', requiredPauses: 0 },
  { id: 't1_name', text: 'My name is Sam', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'My name is Sam', requiredPauses: 0 },

  // Colors & Numbers
  { id: 't1_blue', text: 'The sky is blue', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'The sky is blue', requiredPauses: 0 },
  { id: 't1_green', text: 'Grass is green', wordCount: 3, tier: 1, category: 'nature', chunkedText: 'Grass is green', requiredPauses: 0 },
  { id: 't1_one', text: 'I have one toy', wordCount: 4, tier: 1, category: 'play', chunkedText: 'I have one toy', requiredPauses: 0 },
  { id: 't1_two', text: 'I see two stars', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'I see two stars', requiredPauses: 0 },
  { id: 't1_big', text: 'The ball is big', wordCount: 4, tier: 1, category: 'play', chunkedText: 'The ball is big', requiredPauses: 0 },

  // Actions
  { id: 't1_jump', text: 'I can jump high', wordCount: 4, tier: 1, category: 'play', chunkedText: 'I can jump high', requiredPauses: 0 },
  { id: 't1_sing', text: 'I like to sing', wordCount: 4, tier: 1, category: 'play', chunkedText: 'I like to sing', requiredPauses: 0 },
  { id: 't1_read', text: 'I can look at books', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'I can look at books', requiredPauses: 0 },
  { id: 't1_write', text: 'I can write words', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'I can write words', requiredPauses: 0 },
  { id: 't1_sleep', text: 'I need to sleep', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'I need to sleep', requiredPauses: 0 },

  // More Universal Concepts
  { id: 't1_hand', text: 'I have two hands', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'I have two hands', requiredPauses: 0 },
  { id: 't1_cold', text: 'Ice is cold', wordCount: 3, tier: 1, category: 'nature', chunkedText: 'Ice is cold', requiredPauses: 0 },
  { id: 't1_warm', text: 'The sun is warm', wordCount: 4, tier: 1, category: 'nature', chunkedText: 'The sun is warm', requiredPauses: 0 },
  { id: 't1_door', text: 'Open the door', wordCount: 3, tier: 1, category: 'daily', chunkedText: 'Open the door', requiredPauses: 0 },
  { id: 't1_chair', text: 'Sit on the chair', wordCount: 4, tier: 1, category: 'daily', chunkedText: 'Sit on the chair', requiredPauses: 0 },

  // ===== TIER 2: Carrier Phrases (6-9 words, 1 pause) - 40 items =====
  { id: 't2_morning', text: 'I wake up in the morning | and brush my teeth', wordCount: 9, tier: 2, category: 'daily', chunkedText: 'I wake up in the morning | and brush my teeth', requiredPauses: 1 },
  { id: 't2_breakfast', text: 'I eat my breakfast | then go to school', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I eat my breakfast | then go to school', requiredPauses: 1 },
  { id: 't2_wash', text: 'I wash my hands | before I eat food', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I wash my hands | before I eat food', requiredPauses: 1 },
  { id: 't2_bed', text: 'I go to bed | when it is dark', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I go to bed | when it is dark', requiredPauses: 1 },
  { id: 't2_shoes', text: 'I put on my shoes | and tie them tight', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I put on my shoes | and tie them tight', requiredPauses: 1 },
  { id: 't2_mom_help', text: 'My mom helps me | when I need her', wordCount: 8, tier: 2, category: 'family', chunkedText: 'My mom helps me | when I need her', requiredPauses: 1 },
  { id: 't2_dad_work', text: 'My dad goes to work | every single day', wordCount: 8, tier: 2, category: 'family', chunkedText: 'My dad goes to work | every single day', requiredPauses: 1 },
  { id: 't2_friend_play', text: 'My friend and I | like to play ball', wordCount: 8, tier: 2, category: 'family', chunkedText: 'My friend and I | like to play ball', requiredPauses: 1 },
  { id: 't2_sister', text: 'My sister reads books | to me at night', wordCount: 8, tier: 2, category: 'family', chunkedText: 'My sister reads books | to me at night', requiredPauses: 1 },
  { id: 't2_brother', text: 'My brother is kind | and shares his toys', wordCount: 8, tier: 2, category: 'family', chunkedText: 'My brother is kind | and shares his toys', requiredPauses: 1 },
  { id: 't2_dog_run', text: 'The dog likes to run | in the big park', wordCount: 9, tier: 2, category: 'animals', chunkedText: 'The dog likes to run | in the big park', requiredPauses: 1 },
  { id: 't2_cat_sleep', text: 'The cat sleeps on the bed | all day long', wordCount: 9, tier: 2, category: 'animals', chunkedText: 'The cat sleeps on the bed | all day long', requiredPauses: 1 },
  { id: 't2_bird_sing', text: 'The bird sings a song | every morning time', wordCount: 8, tier: 2, category: 'animals', chunkedText: 'The bird sings a song | every morning time', requiredPauses: 1 },
  { id: 't2_fish_swim', text: 'The fish swim in water | and blow small bubbles', wordCount: 8, tier: 2, category: 'animals', chunkedText: 'The fish swim in water | and blow small bubbles', requiredPauses: 1 },
  { id: 't2_rabbit_eat', text: 'The rabbit eats green grass | near the tall tree', wordCount: 8, tier: 2, category: 'animals', chunkedText: 'The rabbit eats green grass | near the tall tree', requiredPauses: 1 },
  { id: 't2_sun_shine', text: 'The sun shines bright | in the blue sky', wordCount: 8, tier: 2, category: 'nature', chunkedText: 'The sun shines bright | in the blue sky', requiredPauses: 1 },
  { id: 't2_rain_fall', text: 'The rain falls down | on all the trees', wordCount: 8, tier: 2, category: 'nature', chunkedText: 'The rain falls down | on all the trees', requiredPauses: 1 },
  { id: 't2_flower_grow', text: 'The flowers grow tall | in my garden plot', wordCount: 8, tier: 2, category: 'nature', chunkedText: 'The flowers grow tall | in my garden plot', requiredPauses: 1 },
  { id: 't2_wind_blow', text: 'The wind blows soft | through my long hair', wordCount: 8, tier: 2, category: 'nature', chunkedText: 'The wind blows soft | through my long hair', requiredPauses: 1 },
  { id: 't2_stars', text: 'The stars come out | when night is here', wordCount: 8, tier: 2, category: 'nature', chunkedText: 'The stars come out | when night is here', requiredPauses: 1 },
  { id: 't2_apple_red', text: 'The red apple is sweet | and good to eat', wordCount: 9, tier: 2, category: 'food', chunkedText: 'The red apple is sweet | and good to eat', requiredPauses: 1 },
  { id: 't2_rice_hot', text: 'I eat hot rice | with my big spoon', wordCount: 8, tier: 2, category: 'food', chunkedText: 'I eat hot rice | with my big spoon', requiredPauses: 1 },
  { id: 't2_water_drink', text: 'I drink cold water | when I am hot', wordCount: 8, tier: 2, category: 'food', chunkedText: 'I drink cold water | when I am hot', requiredPauses: 1 },
  { id: 't2_bread_eat', text: 'I eat soft bread | for my morning meal', wordCount: 8, tier: 2, category: 'food', chunkedText: 'I eat soft bread | for my morning meal', requiredPauses: 1 },
  { id: 't2_fruit', text: 'I like to eat fruit | of every kind', wordCount: 8, tier: 2, category: 'food', chunkedText: 'I like to eat fruit | of every kind', requiredPauses: 1 },
  { id: 't2_ball_throw', text: 'I throw the ball | up in the air', wordCount: 8, tier: 2, category: 'play', chunkedText: 'I throw the ball | up in the air', requiredPauses: 1 },
  { id: 't2_sing_song', text: 'I sing a happy song | with my best friend', wordCount: 9, tier: 2, category: 'play', chunkedText: 'I sing a happy song | with my best friend', requiredPauses: 1 },
  { id: 't2_draw', text: 'I draw with colors | on white paper sheets', wordCount: 7, tier: 2, category: 'play', chunkedText: 'I draw with colors | on white paper sheets', requiredPauses: 1 },
  { id: 't2_run_fast', text: 'I run very fast | in the big field', wordCount: 8, tier: 2, category: 'play', chunkedText: 'I run very fast | in the big field', requiredPauses: 1 },
  { id: 't2_jump_rope', text: 'I jump over the rope | ten times each day', wordCount: 9, tier: 2, category: 'play', chunkedText: 'I jump over the rope | ten times each day', requiredPauses: 1 },
  { id: 't2_book_read', text: 'I look at my book | every day at school', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I look at my book | every day at school', requiredPauses: 1 },
  { id: 't2_write_name', text: 'I can write my name | on the clean board', wordCount: 9, tier: 2, category: 'daily', chunkedText: 'I can write my name | on the clean board', requiredPauses: 1 },
  { id: 't2_count', text: 'I count to ten | using my two hands', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I count to ten | using my two hands', requiredPauses: 1 },
  { id: 't2_learn', text: 'I learn new things | at school each day', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I learn new things | at school each day', requiredPauses: 1 },
  { id: 't2_teacher', text: 'My teacher is nice | and helps me learn', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'My teacher is nice | and helps me learn', requiredPauses: 1 },
  { id: 't2_happy_smile', text: 'I am very happy | when I see my friends', wordCount: 9, tier: 2, category: 'daily', chunkedText: 'I am very happy | when I see my friends', requiredPauses: 1 },
  { id: 't2_help_others', text: 'I like to help others | when they need me', wordCount: 9, tier: 2, category: 'daily', chunkedText: 'I like to help others | when they need me', requiredPauses: 1 },
  { id: 't2_thank_you', text: 'I say thank you | when someone is kind', wordCount: 8, tier: 2, category: 'daily', chunkedText: 'I say thank you | when someone is kind', requiredPauses: 1 },
  { id: 't2_share', text: 'I share my toys | with all my friends', wordCount: 8, tier: 2, category: 'play', chunkedText: 'I share my toys | with all my friends', requiredPauses: 1 },
  { id: 't2_listen', text: 'I listen well | when people are talking', wordCount: 7, tier: 2, category: 'daily', chunkedText: 'I listen well | when people are talking', requiredPauses: 1 },

  // ===== TIER 3: Complex Sentences (10-14 words, 2+ pauses) - 40 items =====
  { id: 't3_morning_routine', text: 'Every morning I wake up | brush my teeth | and eat my breakfast', wordCount: 12, tier: 3, category: 'daily', chunkedText: 'Every morning I wake up | brush my teeth | and eat my breakfast', requiredPauses: 2 },
  { id: 't3_school_day', text: 'I go to school | learn many new things | and play with friends', wordCount: 13, tier: 3, category: 'daily', chunkedText: 'I go to school | learn many new things | and play with friends', requiredPauses: 2 },
  { id: 't3_help_home', text: 'I help my mom at home | by cleaning my room | and washing dishes', wordCount: 13, tier: 3, category: 'daily', chunkedText: 'I help my mom at home | by cleaning my room | and washing dishes', requiredPauses: 2 },
  { id: 't3_bedtime', text: 'Before I sleep | I look at a good book | and say goodnight to mom', wordCount: 14, tier: 3, category: 'daily', chunkedText: 'Before I sleep | I look at a good book | and say goodnight to mom', requiredPauses: 2 },
  { id: 't3_weekend', text: 'On the weekend | I like to play outside | with all my best friends', wordCount: 14, tier: 3, category: 'play', chunkedText: 'On the weekend | I like to play outside | with all my best friends', requiredPauses: 2 },
  { id: 't3_family_dinner', text: 'My family eats dinner together | we talk and laugh | about our day', wordCount: 13, tier: 3, category: 'family', chunkedText: 'My family eats dinner together | we talk and laugh | about our day', requiredPauses: 2 },
  { id: 't3_dad_teach', text: 'My dad teaches me | how to ride my bike | in the big park', wordCount: 13, tier: 3, category: 'family', chunkedText: 'My dad teaches me | how to ride my bike | in the big park', requiredPauses: 2 },
  { id: 't3_mom_cook', text: 'My mom cooks good food | in our warm kitchen | every single day', wordCount: 12, tier: 3, category: 'family', chunkedText: 'My mom cooks good food | in our warm kitchen | every single day', requiredPauses: 2 },
  { id: 't3_grandma', text: 'My grandma tells me stories | about when she was young | long ago', wordCount: 12, tier: 3, category: 'family', chunkedText: 'My grandma tells me stories | about when she was young | long ago', requiredPauses: 2 },
  { id: 't3_picnic', text: 'We go on a picnic | eat under the trees | and enjoy nature', wordCount: 13, tier: 3, category: 'family', chunkedText: 'We go on a picnic | eat under the trees | and enjoy nature', requiredPauses: 2 },
  { id: 't3_garden', text: 'In my garden there are flowers | red and yellow ones | growing so tall', wordCount: 13, tier: 3, category: 'nature', chunkedText: 'In my garden there are flowers | red and yellow ones | growing so tall', requiredPauses: 2 },
  { id: 't3_rain_day', text: 'When it rains outside | I stay inside | and watch through the window', wordCount: 12, tier: 3, category: 'nature', chunkedText: 'When it rains outside | I stay inside | and watch through the window', requiredPauses: 2 },
  { id: 't3_butterfly', text: 'The butterfly flies around | from flower to flower | drinking sweet nectar', wordCount: 11, tier: 3, category: 'animals', chunkedText: 'The butterfly flies around | from flower to flower | drinking sweet nectar', requiredPauses: 2 },
  { id: 't3_puppy', text: 'My new puppy is small | with soft brown fur | and big round eyes', wordCount: 13, tier: 3, category: 'animals', chunkedText: 'My new puppy is small | with soft brown fur | and big round eyes', requiredPauses: 2 },
  { id: 't3_birds_nest', text: 'The birds build their nest | high up in the tree | using small sticks', wordCount: 13, tier: 3, category: 'animals', chunkedText: 'The birds build their nest | high up in the tree | using small sticks', requiredPauses: 2 },
  { id: 't3_hide_seek', text: 'I play hide and seek | with my friends outside | in the green park', wordCount: 13, tier: 3, category: 'play', chunkedText: 'I play hide and seek | with my friends outside | in the green park', requiredPauses: 2 },
  { id: 't3_build_blocks', text: 'I build tall towers | using colorful blocks | that reach very high', wordCount: 11, tier: 3, category: 'play', chunkedText: 'I build tall towers | using colorful blocks | that reach very high', requiredPauses: 2 },
  { id: 't3_paint', text: 'I like to paint pictures | with many bright colors | on big white paper', wordCount: 13, tier: 3, category: 'play', chunkedText: 'I like to paint pictures | with many bright colors | on big white paper', requiredPauses: 2 },
  { id: 't3_soccer', text: 'I kick the soccer ball | across the green field | to score a goal', wordCount: 13, tier: 3, category: 'play', chunkedText: 'I kick the soccer ball | across the green field | to score a goal', requiredPauses: 2 },
  { id: 't3_music', text: 'I listen to music | that makes me want to dance | and clap my hands', wordCount: 14, tier: 3, category: 'play', chunkedText: 'I listen to music | that makes me want to dance | and clap my hands', requiredPauses: 2 },
  { id: 't3_alphabet', text: 'I can say my alphabet | from A all the way | to letter Z', wordCount: 14, tier: 3, category: 'daily', chunkedText: 'I can say my alphabet | from A all the way | to letter Z', requiredPauses: 2 },
  { id: 't3_numbers', text: 'I count all my numbers | from one up to ten | using my fingers', wordCount: 13, tier: 3, category: 'daily', chunkedText: 'I count all my numbers | from one up to ten | using my fingers', requiredPauses: 2 },
  { id: 't3_library', text: 'I go to the library | choose a good book | and look at it quietly', wordCount: 13, tier: 3, category: 'daily', chunkedText: 'I go to the library | choose a good book | and look at it quietly', requiredPauses: 2 },
  { id: 't3_draw_sun', text: 'I draw a yellow sun | a blue sky above | and green grass below', wordCount: 14, tier: 3, category: 'play', chunkedText: 'I draw a yellow sun | a blue sky above | and green grass below', requiredPauses: 2 },
  { id: 't3_science', text: 'At school I learn | about plants and animals | and how they grow', wordCount: 12, tier: 3, category: 'daily', chunkedText: 'At school I learn | about plants and animals | and how they grow', requiredPauses: 2 },
  { id: 't3_lunch_box', text: 'In my lunch box | I have a sandwich | and fresh fruit too', wordCount: 12, tier: 3, category: 'food', chunkedText: 'In my lunch box | I have a sandwich | and fresh fruit too', requiredPauses: 2 },
  { id: 't3_baking', text: 'I help my mom bake cookies | we mix all the things | and put them in the oven', wordCount: 16, tier: 3, category: 'food', chunkedText: 'I help my mom bake cookies | we mix all the things | and put them in the oven', requiredPauses: 2 },
  { id: 't3_vegetables', text: 'I eat my vegetables | like carrots and peas | because they are healthy', wordCount: 12, tier: 3, category: 'food', chunkedText: 'I eat my vegetables | like carrots and peas | because they are healthy', requiredPauses: 2 },
  { id: 't3_ice_cream', text: 'My favorite ice cream | is the cold chocolate kind | that tastes so good', wordCount: 13, tier: 3, category: 'food', chunkedText: 'My favorite ice cream | is the cold chocolate kind | that tastes so good', requiredPauses: 2 },
  { id: 't3_breakfast_time', text: 'For breakfast I eat | eggs and toast | with a big glass of milk', wordCount: 13, tier: 3, category: 'food', chunkedText: 'For breakfast I eat | eggs and toast | with a big glass of milk', requiredPauses: 2 },
  { id: 't3_kind', text: 'I try to be kind | to all the people | that I meet each day', wordCount: 14, tier: 3, category: 'daily', chunkedText: 'I try to be kind | to all the people | that I meet each day', requiredPauses: 2 },
  { id: 't3_sorry', text: 'When I make a mistake | I say I am sorry | and try again', wordCount: 13, tier: 3, category: 'daily', chunkedText: 'When I make a mistake | I say I am sorry | and try again', requiredPauses: 2 },
  { id: 't3_share_toys', text: 'I like to share my toys | with children who have none | to make them smile', wordCount: 14, tier: 3, category: 'play', chunkedText: 'I like to share my toys | with children who have none | to make them smile', requiredPauses: 2 },
  { id: 't3_birthday', text: 'On my birthday | all my friends come over | and we have fun', wordCount: 12, tier: 3, category: 'daily', chunkedText: 'On my birthday | all my friends come over | and we have fun', requiredPauses: 2 },
  { id: 't3_help_friend', text: 'I help my friend | when they fall down | and need to get up', wordCount: 13, tier: 3, category: 'daily', chunkedText: 'I help my friend | when they fall down | and need to get up', requiredPauses: 2 },
  { id: 't3_summer', text: 'In the summer time | the days are long and hot | and I swim a lot', wordCount: 15, tier: 3, category: 'nature', chunkedText: 'In the summer time | the days are long and hot | and I swim a lot', requiredPauses: 2 },
  { id: 't3_winter', text: 'When winter comes | snow falls from the sky | and covers the ground', wordCount: 12, tier: 3, category: 'nature', chunkedText: 'When winter comes | snow falls from the sky | and covers the ground', requiredPauses: 2 },
  { id: 't3_spring', text: 'In the spring season | new flowers start to grow | and birds sing songs', wordCount: 13, tier: 3, category: 'nature', chunkedText: 'In the spring season | new flowers start to grow | and birds sing songs', requiredPauses: 2 },
  { id: 't3_night_sky', text: 'At night the sky | is filled with bright stars | that shine like diamonds', wordCount: 13, tier: 3, category: 'nature', chunkedText: 'At night the sky | is filled with bright stars | that shine like diamonds', requiredPauses: 2 },
  { id: 't3_morning_sun', text: 'The morning sun rises | over the tall mountains | bringing a new day', wordCount: 12, tier: 3, category: 'nature', chunkedText: 'The morning sun rises | over the tall mountains | bringing a new day', requiredPauses: 2 },
];

async function seedTurtlePool() {
  console.log('\n🐢 Seeding Turtle Content Pool...');
  const poolRef = db.collection('turtle_content_pool');

  // Delete existing
  const existing = await poolRef.get();
  const batch = db.batch();
  existing.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Add new items
  let added = 0;
  for (const item of turtlePool) {
    const docRef = poolRef.doc(item.id);
    await docRef.set({
      ...item,
      createdAt: new Date().toISOString()
    });
    added++;
    if (added % 20 === 0) {
      process.stdout.write(`   ${added}/${turtlePool.length}... `);
    }
  }
  console.log(`\n   ✅ Seeded ${added} turtle content items`);
}

// ============================================================================
// PART 3: TAPPING CONTENT POOL (24 words/sentences, Tiers 1-3)
// ============================================================================

interface TappingContentItem {
  id: string;
  text: string;
  syllables: string[];
  tier: 1 | 2 | 3;
  category: 'animals' | 'food' | 'objects' | 'places' | 'actions' | 'sentences';
}

const tappingPool: TappingContentItem[] = [
  // --- TIER 1: Common Words (4 Items) ---
  { id: 'monkey', text: 'Monkey', syllables: ['Mon', 'key'], tier: 1, category: 'animals' },
  { id: 'apple', text: 'Apple', syllables: ['Ap', 'ple'], tier: 1, category: 'food' },
  { id: 'water', text: 'Water', syllables: ['Wa', 'ter'], tier: 1, category: 'food' },
  { id: 'happy', text: 'Happy', syllables: ['Hap', 'py'], tier: 1, category: 'actions' },

  // --- TIER 2: Short Sentences (8 Items) ---
  { id: 'i-like-it', text: 'I like it', syllables: ['I', 'like', 'it'], tier: 2, category: 'sentences' },
  { id: 'see-the-dog', text: 'See the dog', syllables: ['See', 'the', 'dog'], tier: 2, category: 'sentences' },
  { id: 'red-big-ball', text: 'Red big ball', syllables: ['Red', 'big', 'ball'], tier: 2, category: 'sentences' },
  { id: 'time-to-go', text: 'Time to go', syllables: ['Time', 'to', 'go'], tier: 2, category: 'sentences' },
  { id: 'open-the-door', text: 'Open the door', syllables: ['O', 'pen', 'the', 'door'], tier: 2, category: 'sentences' },
  { id: 'hello-my-friend', text: 'Hello my friend', syllables: ['Hel', 'lo', 'my', 'friend'], tier: 2, category: 'sentences' },
  { id: 'look-at-that', text: 'Look at that', syllables: ['Look', 'at', 'that'], tier: 2, category: 'sentences' },
  { id: 'sun-is-hot', text: 'Sun is hot', syllables: ['Sun', 'is', 'hot'], tier: 2, category: 'sentences' },

  // --- TIER 3: Complex Sentences (12 Items) ---
  { id: 'the-sun-is-shining', text: 'The sun is shining', syllables: ['The', 'sun', 'is', 'shi', 'ning'], tier: 3, category: 'sentences' },
  { id: 'we-play-in-the-park', text: 'We play in the park', syllables: ['We', 'play', 'in', 'the', 'park'], tier: 3, category: 'sentences' },
  { id: 'can-we-go-outside', text: 'Can we go outside', syllables: ['Can', 'we', 'go', 'out', 'side'], tier: 3, category: 'sentences' },
  { id: 'birds-fly-in-the-sky', text: 'Birds fly in the sky', syllables: ['Birds', 'fly', 'in', 'the', 'sky'], tier: 3, category: 'sentences' },
  { id: 'i-want-apple-juice', text: 'I want apple juice', syllables: ['I', 'want', 'ap', 'ple', 'juice'], tier: 3, category: 'sentences' },
  { id: 'where-is-my-blue-shoe', text: 'Where is my blue shoe', syllables: ['Where', 'is', 'my', 'blue', 'shoe'], tier: 3, category: 'sentences' },
  { id: 'reading-is-really-fun', text: 'Reading is really fun', syllables: ['Read', 'ing', 'is', 'real', 'ly', 'fun'], tier: 3, category: 'sentences' },
  { id: 'the-cat-sleeps-all-day', text: 'The cat sleeps all day', syllables: ['The', 'cat', 'sleeps', 'all', 'day'], tier: 3, category: 'sentences' },
  { id: 'let-us-bake-some-cake', text: 'Let us bake some cake', syllables: ['Let', 'us', 'bake', 'some', 'cake'], tier: 3, category: 'sentences' },
  { id: 'my-bag-is-very-heavy', text: 'My bag is very heavy', syllables: ['My', 'bag', 'is', 'ver', 'y', 'heav', 'y'], tier: 3, category: 'sentences' },
  { id: 'today-is-a-good-day', text: 'Today is a good day', syllables: ['To', 'day', 'is', 'a', 'good', 'day'], tier: 3, category: 'sentences' },
  { id: 'please-pass-the-water', text: 'Please pass the water', syllables: ['Please', 'pass', 'the', 'wa', 'ter'], tier: 3, category: 'sentences' }
];

async function seedTappingPool() {
  console.log('\n🎯 Seeding Tapping Content Pool...');
  const batch = db.batch();

  for (const item of tappingPool) {
    const ref = db.collection('tapping_content_pool').doc(item.id);
    batch.set(ref, item);
  }

  await batch.commit();
  console.log(`   ✅ Seeded ${tappingPool.length} tapping words (Tiers 1-3)`);
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  StamFree Firestore Content Seeder    ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await seedSnakePool();
    await seedTurtlePool();
    await seedTappingPool();

    console.log('\n✨ All seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`   • 16 snake phonemes seeded (Tiers 1-2)`);
    console.log(`   • 120 turtle sentences seeded (Tiers 1-3)`);
    console.log(`   • 24 tapping words/sentences seeded (Tiers 1-3)`);
    console.log('\n🎮 The app is now ready to run!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
