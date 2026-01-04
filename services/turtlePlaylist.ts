import { db } from '@/config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

// --- Types ---

export interface TurtleContent {
  id: string;
  text: string;
  wordCount: number;
  tier: 1 | 2 | 3;
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
}

// --- Constants ---

const INITIAL_DECK_SIZE = 4; // 4 sentences per session
const MASTERY_ATTEMPTS = 2; // Easier to master than Snake
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
      itemStats: {}
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
    itemStats: {}
  };

  await setDoc(playlistRef, newPlaylist);
  return newPlaylist;
}

/**
 * Gets the "Next" session content (3 laps of 4 items).
 * Returns an array of arrays: [Lap1, Lap2, Lap3]
 */
export async function getNextTurtleSession(userId: string): Promise<TurtleContent[][]> {
  let playlist = await initializeSnakePlaylistFallback(userId);

  // 1. Fetch the Active Deck (4 items)
  const activeDeck: TurtleContent[] = [];
  
  for (const id of playlist.activeItems) {
    const docRef = doc(db, 'turtle_content_pool', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      activeDeck.push({
        id: snap.id,
        text: data.text,
        tier: data.tier,
        wordCount: data.wordCount
      });
    }
  }

  // 2. Create 3 Laps (Repetition with Context Change)
  // In the future, we could mix in review items, but for now,
  // we drill the same 4 items to ensure mastery within the session.
  return [activeDeck, activeDeck, activeDeck];
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
): Promise<{ leveledUp: boolean }> {
  const playlistRef = doc(db, `users/${userId}/turtle_progress/playlist`);
  const snap = await getDoc(playlistRef);
  
  if (!snap.exists()) return { leveledUp: false };

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
    [`itemStats.${itemId}`]: stats
  });

  return { leveledUp };
}
