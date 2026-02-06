import { db } from '@/config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

// --- Types ---

export interface TurtleContent {
  id: string;
  text: string;
  wordCount: number;
  tier: 1 | 2 | 3;
  requiredPauses?: number;  // NEW: For Tier 2/3 pause requirements
  chunkedText?: string;  // NEW: Text with pause markers (e.g., "I put my books | in my bag")
}

export interface TurtlePlaylist {
  userId: string;
  activeItems: string[]; // List of IDs (e.g., ['t1_1', 't1_2', ...])
  masteredItems: string[];
  lockedItems: string[]; // Remaining pool IDs
  
  // Track metrics for mastery
  itemStats: {
    [itemId: string]: {
      attempts: number;
      successCount: number;
      lastPlayed: string; // ISO Date
    }
  };
  
  // NEW: XP Progression System
  xp: number;
  tier1Unlocked: boolean; // Always true
  tier2Unlocked: boolean; // Unlocks at 500 XP
  tier3Unlocked: boolean; // Unlocks at 1500 XP
}

// --- Constants ---

const INITIAL_DECK_SIZE = 12; // Match session size (12 items needed per session)
const ITEMS_PER_JOURNEY = 4;
const JOURNEYS_PER_SESSION = 3;
const SESSION_SIZE = ITEMS_PER_JOURNEY * JOURNEYS_PER_SESSION; // 12
const MASTERY_ATTEMPTS = 1; // Lowered to 1 to cycle content faster with variety
const MASTERY_RATIO = 0.75;

// --- Service Functions ---

/**
 * Initializes the playlist for a new user if it doesn't exist.
 */
export async function initializeTurtlePlaylist(userId: string): Promise<TurtlePlaylist> {
  const playlistRef = doc(db, `users/${userId}/turtle_progress/playlist`);
  const snap = await getDoc(playlistRef);

  if (snap.exists()) {
    return snap.data() as TurtlePlaylist;
  }

  // Fetch full pool from Firestore (New specific collection)
  const poolSnap = await getDocs(collection(db, 'turtle_content_pool'));
  
  const allItems: TurtleContent[] = poolSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      text: data.text,
      tier: data.tier,
      wordCount: data.wordCount,
    };
  });

  // Sort by Tier (1 -> 2 -> 3) then Length
  allItems.sort((a, b) => a.tier - b.tier || a.wordCount - b.wordCount);
  
  const allIds = allItems.map(i => i.id);

  if (allIds.length === 0) {
    console.error("CRITICAL: Turtle content pool not seeded!");
    return {
      userId,
      activeItems: [],
      masteredItems: [],
      lockedItems: [],
      itemStats: {},
      xp: 0,
      tier1Unlocked: true,
      tier2Unlocked: false,
      tier3Unlocked: false
    };
  }

  // Slice the pool
  const initialActive = allIds.slice(0, INITIAL_DECK_SIZE);
  const initialLocked = allIds.slice(INITIAL_DECK_SIZE);

  const newPlaylist: TurtlePlaylist = {
    userId,
    activeItems: initialActive,
    masteredItems: [],
    lockedItems: initialLocked,
    itemStats: {},
    xp: 0,
    tier1Unlocked: true,
    tier2Unlocked: false,
    tier3Unlocked: false
  };

  await setDoc(playlistRef, newPlaylist);
  return newPlaylist;
}

export async function getNextTurtleSession(userId: string): Promise<TurtleContent[][]> {
  let playlist = await initializeSnakePlaylistFallback(userId);
  let hasChanges = false;

  // Ensure we have enough active items for a full session (12)
  if (playlist.activeItems.length < SESSION_SIZE) {
    const needed = SESSION_SIZE - playlist.activeItems.length;
    
    // Pull from locked
    if (playlist.lockedItems.length > 0) {
        const toAdd = playlist.lockedItems.splice(0, needed);
        playlist.activeItems.push(...toAdd);
        
        // Update DB immediately to reserve these items
        const playlistRef = doc(db, `users/${userId}/turtle_progress/playlist`);
        await updateDoc(playlistRef, {
            activeItems: playlist.activeItems,
            lockedItems: playlist.lockedItems
        });
    }
  }
  
  // 1. Fetch Session Items (Aim for 12 unique)
  // Logic: Take up to 12 items from active deck.
  // If < 12 available (even after pull), just cycle what we have.
  const sessionIds = playlist.activeItems.slice(0, SESSION_SIZE);
  
  const fetchedItems: TurtleContent[] = [];
  
  for (const id of sessionIds) {
    const docRef = doc(db, 'turtle_content_pool', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      fetchedItems.push({
        id: snap.id,
        text: data.text,
        tier: data.tier,
        wordCount: data.wordCount,
        requiredPauses: data.requiredPauses,
        chunkedText: data.chunkedText
      });
    }
  }

  // Shuffle for variety each session
  const shuffled = shuffleArray(fetchedItems);

  // 2. Distribute into 3 Journeys
  // Journey 1: Items 0-3
  // Journey 2: Items 4-7
  // Journey 3: Items 8-11
  // If we have fewer than 12 items total, wrap around.
  const journey1: TurtleContent[] = [];
  const journey2: TurtleContent[] = [];
  const journey3: TurtleContent[] = [];

  for (let i = 0; i < ITEMS_PER_JOURNEY; i++) {
     if (shuffled.length > 0) {
        journey1.push(shuffled[i % shuffled.length]);
        journey2.push(shuffled[(i + 4) % shuffled.length]);
        journey3.push(shuffled[(i + 8) % shuffled.length]);
     }
  }
  
  return [journey1, journey2, journey3];
}

// Helper: Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper to avoid circular dependency or import issues if reuse
async function initializeSnakePlaylistFallback(userId: string) {
    return initializeTurtlePlaylist(userId);
}

/**
 * Updates stats after a game session and checks for Mastery ("The Slide").
 */
export async function recordTurtleResult(
  userId: string, 
  itemId: string, 
  isSuccess: boolean
): Promise<{ leveledUp: boolean; xpAwarded: number }> {
  const playlistRef = doc(db, `users/${userId}/turtle_progress/playlist`);
  const snap = await getDoc(playlistRef);
  
  if (!snap.exists()) return { leveledUp: false, xpAwarded: 0 };

  const playlist = snap.data() as TurtlePlaylist;
  const stats = playlist.itemStats[itemId] || { attempts: 0, successCount: 0, lastPlayed: '' };

  // Update Stats
  stats.attempts += 1;
  if (isSuccess) stats.successCount += 1;
  stats.lastPlayed = new Date().toISOString();

  playlist.itemStats[itemId] = stats;

  // Check Mastery
  const ratio = stats.successCount / stats.attempts;
  let leveledUp = false;
  let xpAwarded = 0;

  // Award XP on success
  if (isSuccess) {
    // Fetch item to determine tier
    const itemRef = doc(db, 'turtle_content_pool', itemId);
    const itemSnap = await getDoc(itemRef);
    
    if (itemSnap.exists()) {
      const itemData = itemSnap.data();
      const tier = itemData.tier as 1 | 2 | 3;
      
      // Award XP based on tier
      switch (tier) {
        case 1: xpAwarded = 10; break;
        case 2: xpAwarded = 25; break;
        case 3: xpAwarded = 50; break;
      }
      
      playlist.xp = (playlist.xp || 0) + xpAwarded;
      
      // Check unlock thresholds
      if (playlist.xp >= 500 && !playlist.tier2Unlocked) {
        playlist.tier2Unlocked = true;
        console.log('🎉 Tier 2 Unlocked! (500 XP)');
      }
      if (playlist.xp >= 1500 && !playlist.tier3Unlocked) {
        playlist.tier3Unlocked = true;
        console.log('🎉 Tier 3 Unlocked! (1500 XP)');
      }
    }
  }

  // Only master if CURRENT attempt was successful
  if (isSuccess && stats.attempts >= MASTERY_ATTEMPTS && ratio >= MASTERY_RATIO) {
    leveledUp = true;
    
    // 1. Move to Mastered
    if (!playlist.masteredItems.includes(itemId)) {
        playlist.masteredItems.push(itemId);
    }
    
    // 2. Remove from Active
    playlist.activeItems = playlist.activeItems.filter(id => id !== itemId);

    // 3. Pull from Locked
    if (playlist.lockedItems.length > 0) {
        const newItem = playlist.lockedItems.shift(); 
        if (newItem) {
            playlist.activeItems.push(newItem);
        }
    }
  }

  // Save changes
  await updateDoc(playlistRef, {
    activeItems: playlist.activeItems,
    masteredItems: playlist.masteredItems,
    lockedItems: playlist.lockedItems,
    [`itemStats.${itemId}`]: stats,
    xp: playlist.xp || 0,
    tier2Unlocked: playlist.tier2Unlocked || false,
    tier3Unlocked: playlist.tier3Unlocked || false
  });

  return { leveledUp, xpAwarded };
}
