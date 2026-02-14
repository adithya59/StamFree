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
  // --- TIER 1: Common Words (4 Items) ---
  { id: 'monkey', text: 'Monkey', syllables: ['Mon', 'key'], tier: 1, category: 'animals', ipa: 'ˈmʌŋki' },
  { id: 'apple', text: 'Apple', syllables: ['Ap', 'ple'], tier: 1, category: 'food', ipa: 'ˈæpəl' },
  { id: 'water', text: 'Water', syllables: ['Wa', 'ter'], tier: 1, category: 'food', ipa: 'ˈwɔːtər' },
  { id: 'happy', text: 'Happy', syllables: ['Hap', 'py'], tier: 1, category: 'actions', ipa: 'ˈhæpi' },

  // --- TIER 2: Short Sentences (8 Items) ---
  { id: 'i-like-it', text: 'I like it', syllables: ['I', 'like', 'it'], tier: 2, category: 'sentences', ipa: 'aɪ laɪk ɪt' },
  { id: 'see-the-dog', text: 'See the dog', syllables: ['See', 'the', 'dog'], tier: 2, category: 'sentences', ipa: 'si ðə dɔɡ' },
  { id: 'red-big-ball', text: 'Red big ball', syllables: ['Red', 'big', 'ball'], tier: 2, category: 'sentences', ipa: 'rɛd bɪɡ bɔl' },
  { id: 'time-to-go', text: 'Time to go', syllables: ['Time', 'to', 'go'], tier: 2, category: 'sentences', ipa: 'taɪm tu ɡoʊ' },
  { id: 'open-the-door', text: 'Open the door', syllables: ['O', 'pen', 'the', 'door'], tier: 2, category: 'sentences', ipa: 'ˈoʊpən ðə dɔr' },
  { id: 'hello-my-friend', text: 'Hello my friend', syllables: ['Hel', 'lo', 'my', 'friend'], tier: 2, category: 'sentences', ipa: 'hɛˈloʊ maɪ frɛnd' },
  { id: 'look-at-that', text: 'Look at that', syllables: ['Look', 'at', 'that'], tier: 2, category: 'sentences', ipa: 'lʊk æt ðæt' },
  { id: 'sun-is-hot', text: 'Sun is hot', syllables: ['Sun', 'is', 'hot'], tier: 2, category: 'sentences', ipa: 'sʌn ɪz hɑt' },

  // --- TIER 3: Complex Sentences (12 Items) ---
  { id: 'the-sun-is-shining', text: 'The sun is shining', syllables: ['The', 'sun', 'is', 'shi', 'ning'], tier: 3, category: 'sentences', ipa: 'ðə sʌn ɪz ˈʃaɪnɪŋ' },
  { id: 'we-play-in-the-park', text: 'We play in the park', syllables: ['We', 'play', 'in', 'the', 'park'], tier: 3, category: 'sentences', ipa: 'wi pleɪ ɪn ðə pɑrk' },
  { id: 'can-we-go-outside', text: 'Can we go outside', syllables: ['Can', 'we', 'go', 'out', 'side'], tier: 3, category: 'sentences', ipa: 'kæn wi ɡoʊ ˌaʊtˈsaɪd' },
  { id: 'birds-fly-in-the-sky', text: 'Birds fly in the sky', syllables: ['Birds', 'fly', 'in', 'the', 'sky'], tier: 3, category: 'sentences', ipa: 'bɜrdz flaɪ ɪn ðə skaɪ' },
  { id: 'i-want-apple-juice', text: 'I want apple juice', syllables: ['I', 'want', 'ap', 'ple', 'juice'], tier: 3, category: 'sentences', ipa: 'aɪ wɑnt ˈæpəl dʒus' },
  { id: 'where-is-my-blue-shoe', text: 'Where is my blue shoe', syllables: ['Where', 'is', 'my', 'blue', 'shoe'], tier: 3, category: 'sentences', ipa: 'wɛr ɪz maɪ blu ʃu' },
  { id: 'reading-is-really-fun', text: 'Reading is really fun', syllables: ['Read', 'ing', 'is', 'real', 'ly', 'fun'], tier: 3, category: 'sentences', ipa: 'ˈridɪŋ ɪz ˈrɪəli fʌn' },
  { id: 'the-cat-sleeps-all-day', text: 'The cat sleeps all day', syllables: ['The', 'cat', 'sleeps', 'all', 'day'], tier: 3, category: 'sentences', ipa: 'ðə kæt slips ɔl deɪ' },
  { id: 'let-us-bake-some-cake', text: 'Let us bake some cake', syllables: ['Let', 'us', 'bake', 'some', 'cake'], tier: 3, category: 'sentences', ipa: 'lɛt ʌs beɪk sʌm keɪk' },
  { id: 'my-bag-is-very-heavy', text: 'My bag is very heavy', syllables: ['My', 'bag', 'is', 'ver', 'y', 'heav', 'y'], tier: 3, category: 'sentences', ipa: 'maɪ bæɡ ɪz ˈvɛri ˈhɛvi' },
  { id: 'today-is-a-good-day', text: 'Today is a good day', syllables: ['To', 'day', 'is', 'a', 'good', 'day'], tier: 3, category: 'sentences', ipa: 'təˈdeɪ ɪz ə ɡʊd deɪ' },
  { id: 'please-pass-the-water', text: 'Please pass the water', syllables: ['Please', 'pass', 'the', 'wa', 'ter'], tier: 3, category: 'sentences', ipa: 'pliz pæs ðə ˈwɔtər' },
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
  console.log(`   Tier 1 (Words): ${tierCounts[1] || 0} items`);
  console.log(`   Tier 2 (Short Sentences): ${tierCounts[2] || 0} items`);
  console.log(`   Tier 3 (Complex Sentences): ${tierCounts[3] || 0} items`);
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
