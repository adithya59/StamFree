/**
 * Seed One-Tap Content to Firestore
 * Run: npx ts-node scripts/seed-onetap-content.ts
 */

import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { oneTapPool } from '../services/seedOneTap';

async function seedOneTapContent() {
  console.log('🌱 Seeding One-Tap content to Firestore...');
  
  const contentBankRef = collection(db, 'content_bank');
  let successCount = 0;
  let errorCount = 0;

  for (const word of oneTapPool) {
    try {
      const docRef = doc(contentBankRef, `onetap-${word.id}`);
      
      await setDoc(docRef, {
        // Core content
        contentId: `onetap-${word.id}`,
        gameType: 'onetap',
        text: word.text,
        syllables: word.syllables,
        syllableCount: word.syllables.length,
        
        // Classification
        tier: word.tier,
        category: word.category,
        ipa: word.ipa || '',
        
        // Compatibility
        compatibleGames: ['onetap'], // Only One-Tap uses these
        
        // Metadata
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
        
        // Game-specific fields
        xpReward: word.tier * 10, // Tier 1 = 10 XP, Tier 2 = 20 XP, Tier 3 = 30 XP
        maxRepetitions: 0, // One-Tap requires zero repetitions
        expectedDuration: word.syllables.length * 0.4, // ~0.4s per syllable
      });

      console.log(`✓ Seeded: ${word.text} (Tier ${word.tier}, ${word.syllables.length} syllables)`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to seed ${word.text}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${oneTapPool.length}`);
  
  // Print tier distribution
  const tierCounts = oneTapPool.reduce((acc, word) => {
    acc[word.tier] = (acc[word.tier] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  console.log('\n🎯 Tier Distribution:');
  console.log(`   Tier 1 (2-syl): ${tierCounts[1] || 0} words`);
  console.log(`   Tier 2 (3-syl): ${tierCounts[2] || 0} words`);
  console.log(`   Tier 3 (4+-syl): ${tierCounts[3] || 0} words`);
}

// Run if called directly
if (require.main === module) {
  seedOneTapContent()
    .then(() => {
      console.log('\n✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedOneTapContent };
