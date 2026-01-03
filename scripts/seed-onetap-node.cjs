/**
 * Seed One-Tap Content to Firestore (Node.js version)
 * Run: node scripts/seed-onetap-node.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../server/credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// One-Tap word pool
const oneTapPool = [
  // TIER 1: The Two-Step (2 Syllables)
  { id: 'monkey', text: 'Monkey', syllables: ['Mon', 'key'], tier: 1, category: 'animals', ipa: 'ˈmʌŋki' },
  { id: 'apple', text: 'Apple', syllables: ['Ap', 'ple'], tier: 1, category: 'food', ipa: 'ˈæpəl' },
  { id: 'tiger', text: 'Tiger', syllables: ['Ti', 'ger'], tier: 1, category: 'animals', ipa: 'ˈtaɪɡər' },
  { id: 'baby', text: 'Baby', syllables: ['Ba', 'by'], tier: 1, category: 'objects', ipa: 'ˈbeɪbi' },
  { id: 'happy', text: 'Happy', syllables: ['Hap', 'py'], tier: 1, category: 'actions', ipa: 'ˈhæpi' },
  { id: 'water', text: 'Water', syllables: ['Wa', 'ter'], tier: 1, category: 'objects', ipa: 'ˈwɔːtər' },
  { id: 'funny', text: 'Funny', syllables: ['Fun', 'ny'], tier: 1, category: 'actions', ipa: 'ˈfʌni' },
  { id: 'puppy', text: 'Puppy', syllables: ['Pup', 'py'], tier: 1, category: 'animals', ipa: 'ˈpʌpi' },

  // TIER 2: The Triple Threat (3 Syllables)
  { id: 'spaghetti', text: 'Spaghetti', syllables: ['Spa', 'ghet', 'ti'], tier: 2, category: 'food', ipa: 'spəˈɡɛti' },
  { id: 'banana', text: 'Banana', syllables: ['Ba', 'na', 'na'], tier: 2, category: 'food', ipa: 'bəˈnænə' },
  { id: 'dinosaur', text: 'Dinosaur', syllables: ['Di', 'no', 'saur'], tier: 2, category: 'animals', ipa: 'ˈdaɪnəsɔːr' },
  { id: 'computer', text: 'Computer', syllables: ['Com', 'pu', 'ter'], tier: 2, category: 'objects', ipa: 'kəmˈpjuːtər' },
  { id: 'elephant', text: 'Elephant', syllables: ['E', 'le', 'phant'], tier: 2, category: 'animals', ipa: 'ˈɛləfənt' },
  { id: 'tomato', text: 'Tomato', syllables: ['To', 'ma', 'to'], tier: 2, category: 'food', ipa: 'təˈmeɪtoʊ' },
  { id: 'butterfly', text: 'Butterfly', syllables: ['But', 'ter', 'fly'], tier: 2, category: 'animals', ipa: 'ˈbʌtərflaɪ' },
  { id: 'beautiful', text: 'Beautiful', syllables: ['Beau', 'ti', 'ful'], tier: 2, category: 'actions', ipa: 'ˈbjuːtɪfəl' },

  // TIER 3: The Challenge (4+ Syllables)
  { id: 'watermelon', text: 'Watermelon', syllables: ['Wa', 'ter', 'me', 'lon'], tier: 3, category: 'food', ipa: 'ˈwɔːtərˌmɛlən' },
  { id: 'helicopter', text: 'Helicopter', syllables: ['He', 'li', 'cop', 'ter'], tier: 3, category: 'objects', ipa: 'ˈhɛlɪkɒptər' },
  { id: 'refrigerator', text: 'Refrigerator', syllables: ['Re', 'fri', 'ge', 'ra', 'tor'], tier: 3, category: 'objects', ipa: 'rɪˈfrɪdʒəreɪtər' },
  { id: 'vegetable', text: 'Vegetable', syllables: ['Ve', 'ge', 'ta', 'ble'], tier: 3, category: 'food', ipa: 'ˈvɛdʒtəbəl' },
  { id: 'trampoline', text: 'Trampoline', syllables: ['Tram', 'po', 'line'], tier: 3, category: 'objects', ipa: 'ˌtræmpəˈliːn' },
  { id: 'television', text: 'Television', syllables: ['Te', 'le', 'vi', 'sion'], tier: 3, category: 'objects', ipa: 'ˈtɛləˌvɪʒən' },
];

async function seedOneTapContent() {
  console.log('🌱 Seeding One-Tap content to Firestore...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const word of oneTapPool) {
    try {
      const docRef = db.collection('content_bank').doc(`onetap-${word.id}`);
      
      await docRef.set({
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
        compatibleGames: ['onetap'],
        
        // Metadata
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true,
        
        // Game-specific fields
        xpReward: word.tier * 10,
        maxRepetitions: 0,
        expectedDuration: word.syllables.length * 0.4,
      });

      console.log(`✓ Seeded: ${word.text} (Tier ${word.tier}, ${word.syllables.length} syllables)`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to seed ${word.text}:`, error.message);
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
  }, {});
  
  console.log('\n🎯 Tier Distribution:');
  console.log(`   Tier 1 (2-syl): ${tierCounts[1] || 0} words`);
  console.log(`   Tier 2 (3-syl): ${tierCounts[2] || 0} words`);
  console.log(`   Tier 3 (4+-syl): ${tierCounts[3] || 0} words`);
}

// Run
seedOneTapContent()
  .then(() => {
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
