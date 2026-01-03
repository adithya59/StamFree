import { db } from '@/config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// --- Types ---

export interface SnakePlaylist {
  userId: string;
  activePhonemes: string[]; // List of IDs (e.g., ['m', 'n', 'a', 'e', 'o'])
  masteredPhonemes: string[];
  lockedPhonemes: string[]; // Remaining pool IDs
  
  // Track metrics for mastery
  phonemeStats: {
    [phonemeId: string]: {
      attempts: number;
      successCount: number;
      lastPlayed: string; // ISO Date
    }
  };
}

export interface PhonemeData {
  id: string;
  phoneme: string;
  ipa: string;
  tier: 1 | 2;
  example: string;
  category: string;
}

// --- Constants ---

const INITIAL_DECK_SIZE = 5;
const MASTERY_ATTEMPTS = 3;
const MASTERY_RATIO = 0.8;

// --- Service Functions ---

/**
 * Initializes the playlist for a new user if it doesn't exist.
 */
export async function initializeSnakePlaylist(userId: string): Promise<SnakePlaylist> {
  const playlistRef = doc(db, `users/${userId}/snake_progress/playlist`);
  const snap = await getDoc(playlistRef);

  if (snap.exists()) {
    return snap.data() as SnakePlaylist;
  }

  // Fetch full pool from Firestore (Seeded by admin script)
  // Ordered by tier to ensure we start easy
  const poolSnap = await getDocs(query(collection(db, 'snake_phoneme_pool'), orderBy('tier', 'asc')));
  const allPhonemeIds = poolSnap.docs.map(d => d.id);

  if (allPhonemeIds.length === 0) {
    console.error("CRITICAL: Snake pool not seeded!");
    // Fallback if DB is empty (should not happen in prod)
    return {
      userId,
      activePhonemes: ['m'], 
      masteredPhonemes: [],
      lockedPhonemes: [],
      phonemeStats: {}
    };
  }

  // Slice the pool
  const initialActive = allPhonemeIds.slice(0, INITIAL_DECK_SIZE);
  const initialLocked = allPhonemeIds.slice(INITIAL_DECK_SIZE);

  const newPlaylist: SnakePlaylist = {
    userId,
    activePhonemes: initialActive,
    masteredPhonemes: [],
    lockedPhonemes: initialLocked,
    phonemeStats: {}
  };

  await setDoc(playlistRef, newPlaylist);
  return newPlaylist;
}

/**
 * Gets the "Next" session configuration for the game loop.
 * Picks a phoneme from the active deck (Round Robin or Random).
 */
export async function getNextSnakeSession(userId: string) {
  let playlist = await initializeSnakePlaylist(userId); // Ensure exists

  // Pick one from active (Simple Random for now, could be Least Played)
  const randomIndex = Math.floor(Math.random() * playlist.activePhonemes.length);
  const targetId = playlist.activePhonemes[randomIndex];

  // Fetch details for this phoneme
  const phonemeDoc = await getDoc(doc(db, 'snake_phoneme_pool', targetId));
  const phonemeData = phonemeDoc.exists() ? phonemeDoc.data() as PhonemeData : null;

  if (!phonemeData) {
    throw new Error(`Phoneme data missing for ID: ${targetId}`);
  }

  return {
    targetId,
    ...phonemeData,
    targetDuration: 3.0 // Standard duration for isolation exercises
  };
}

/**
 * Updates stats after a game session and checks for Mastery ("The Slide").
 */
export async function recordSnakeSessionResult(
  userId: string, 
  phonemeId: string, 
  isSuccess: boolean
): Promise<{ leveledUp: boolean, nextPhoneme?: string }> {
  const playlistRef = doc(db, `users/${userId}/snake_progress/playlist`);
  const snap = await getDoc(playlistRef);
  
  if (!snap.exists()) return { leveledUp: false }; // Should not happen

  const playlist = snap.data() as SnakePlaylist;
  const stats = playlist.phonemeStats[phonemeId] || { attempts: 0, successCount: 0, lastPlayed: '' };

  // Update Stats
  stats.attempts += 1;
  if (isSuccess) stats.successCount += 1;
  stats.lastPlayed = new Date().toISOString();

  playlist.phonemeStats[phonemeId] = stats;

  // Check Mastery
  // Rule 1: Minimum attempts to prevent "lucky hits" or AI false positives
  const MIN_ATTEMPTS_FOR_MASTERY = 3;
  
  // Rule 2: Success Ratio > 65%
  const ratio = stats.successCount / stats.attempts;
  
  let leveledUp = false;
  let nextPhoneme = undefined;

  // Only master if the CURRENT attempt was successful.
  // You shouldn't graduate on a failure, even if your average is high.
  if (isSuccess && stats.attempts >= MIN_ATTEMPTS_FOR_MASTERY && ratio >= MASTERY_RATIO) {
    // MASTERED!
    leveledUp = true;
    
    // 1. Move to Mastered
    if (!playlist.masteredPhonemes.includes(phonemeId)) {
        playlist.masteredPhonemes.push(phonemeId);
    }
    
    // 2. Remove from Active
    playlist.activePhonemes = playlist.activePhonemes.filter(id => id !== phonemeId);

    // 3. Pull from Locked (maintain deck size of 5)
    // We only pull ONE to replace the one we just removed.
    if (playlist.lockedPhonemes.length > 0) {
        const newPhoneme = playlist.lockedPhonemes.shift(); // Take first
        if (newPhoneme) {
            playlist.activePhonemes.push(newPhoneme);
            nextPhoneme = newPhoneme;
        }
    }
  }

  // Save changes
  await updateDoc(playlistRef, {
    activePhonemes: playlist.activePhonemes,
    masteredPhonemes: playlist.masteredPhonemes,
    lockedPhonemes: playlist.lockedPhonemes,
    [`phonemeStats.${phonemeId}`]: stats
  });

  return { leveledUp, nextPhoneme };
}
