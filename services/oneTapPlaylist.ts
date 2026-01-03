/**
 * One-Tap Word Deck Playlist Service
 * "The Dealer" - Sliding Window Progression System
 * 
 * Concept: User always holds 5 Active Word Cards
 * Goal: Accumulate 3 clean successes per word to "master" it
 * Reward: Mastered words are replaced with new cards from the locked deck
 */

import { db } from '@/config/firebaseConfig';
import type { OneTapPlaylist } from '@/types/onetap';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { oneTapPool } from './seedOneTap';

const MASTERY_THRESHOLD = 3; // 3 clean successes to graduate a word
const ACTIVE_DECK_SIZE = 5;  // Always maintain 5 active words

/**
 * Initialize a new playlist for first-time users
 * Starts with first 5 Tier 1 words
 */
function initializePlaylist(userId: string): OneTapPlaylist {
  // Sort pool by tier (Tier 1 first) for progressive difficulty
  const sortedPool = [...oneTapPool].sort((a, b) => a.tier - b.tier);
  const allWordIds = sortedPool.map(w => w.id);
  
  // Take first 5 words as active, rest are locked
  const activeWords = allWordIds.slice(0, ACTIVE_DECK_SIZE);
  const lockedWords = allWordIds.slice(ACTIVE_DECK_SIZE);
  
  return {
    userId,
    activeWords,
    masteredWords: [],
    lockedWords,
    stats: {},
  };
}

/**
 * Get user's current playlist
 * Creates new playlist if user is first-timer
 */
export async function getOneTapPlaylist(userId: string): Promise<OneTapPlaylist> {
  const playlistRef = doc(db, 'users', userId, 'onetap_progress', 'playlist');
  const snapshot = await getDoc(playlistRef);
  
  if (snapshot.exists()) {
    return snapshot.data() as OneTapPlaylist;
  }
  
  // First time user - initialize new playlist
  const newPlaylist = initializePlaylist(userId);
  await setDoc(playlistRef, newPlaylist);
  return newPlaylist;
}

/**
 * Update progress after a session
 * Processes results, checks for mastery, slides the window
 * 
 * @param userId - User's Firebase UID
 * @param results - Array of { wordId, passed } results from the session
 * @returns Updated playlist with newly mastered words (for animations)
 */
export async function updateOneTapProgress(
  userId: string, 
  results: { wordId: string; passed: boolean }[]
): Promise<{ 
  playlist: OneTapPlaylist; 
  newlyMastered: string[];
  promotions: Array<{ oldWord: string; newWord: string }>;
}> {
  const playlistRef = doc(db, 'users', userId, 'onetap_progress', 'playlist');

  return await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(playlistRef);
    
    // 1. Load or initialize playlist
    let playlist: OneTapPlaylist;
    if (snapshot.exists()) {
      playlist = snapshot.data() as OneTapPlaylist;
    } else {
      playlist = initializePlaylist(userId);
    }

    // Ensure active deck is populated (safety check)
    if (playlist.activeWords.length === 0 && playlist.lockedWords.length > 0) {
      const starters = playlist.lockedWords.splice(0, ACTIVE_DECK_SIZE);
      playlist.activeWords = starters;
    }

    // 2. Process Results from the Session
    const newlyMastered: string[] = [];

    results.forEach(({ wordId, passed }) => {
      // Initialize stats if missing
      if (!playlist.stats[wordId]) {
        playlist.stats[wordId] = { 
          id: wordId, 
          successCount: 0, 
          failCount: 0, 
          isMastered: false 
        };
      }

      const stat = playlist.stats[wordId];
      
      if (passed) {
        stat.successCount += 1;
        
        // CHECK MASTERY: 3 accumulative wins!
        if (stat.successCount >= MASTERY_THRESHOLD && !stat.isMastered) {
          stat.isMastered = true;
          newlyMastered.push(wordId);
          console.log(`🎉 Word "${wordId}" mastered! (${stat.successCount} successes)`);
        }
      } else {
        stat.failCount += 1;
        
        // Optional: Regression logic
        // If child fails too much, could reset successCount to ensure solid learning
        // For now, we keep it positive-only (accumulative wins persist)
      }
    });

    // 3. Slide the Window ("The Dealer")
    const promotions: Array<{ oldWord: string; newWord: string }> = [];
    
    if (newlyMastered.length > 0) {
      // Remove mastered words from active deck
      playlist.activeWords = playlist.activeWords.filter(
        id => !newlyMastered.includes(id)
      );
      
      // Add to mastered collection
      playlist.masteredWords.push(...newlyMastered);

      // Deal new cards from locked deck to fill slots
      const slotsNeeded = ACTIVE_DECK_SIZE - playlist.activeWords.length;
      
      if (slotsNeeded > 0 && playlist.lockedWords.length > 0) {
        const newCards = playlist.lockedWords.splice(0, slotsNeeded);
        playlist.activeWords.push(...newCards);
        
        // Track promotions for UI animations (Owl delivers new cards!)
        newlyMastered.forEach((oldWord, index) => {
          if (newCards[index]) {
            promotions.push({ oldWord, newWord: newCards[index] });
          }
        });
        
        console.log(`🦉 Owl delivers ${newCards.length} new cards:`, newCards);
      } else if (playlist.lockedWords.length === 0) {
        console.log('🎊 All words mastered! User completed the One-Tap deck!');
      }
    }

    // 4. Save to Firestore
    transaction.set(playlistRef, playlist);
    
    return { playlist, newlyMastered, promotions };
  });
}

/**
 * Get word details for active deck
 * Maps word IDs to full content items for UI display
 */
export function getActiveWordDetails(playlist: OneTapPlaylist) {
  return playlist.activeWords
    .map(wordId => oneTapPool.find(item => item.id === wordId))
    .filter(item => item !== undefined);
}

/**
 * Get progress for a specific word
 * Returns star count (0-3) and mastery status
 */
export function getWordProgress(
  playlist: OneTapPlaylist, 
  wordId: string
): { stars: number; total: number; isMastered: boolean } {
  const stat = playlist.stats[wordId];
  
  if (!stat) {
    return { stars: 0, total: MASTERY_THRESHOLD, isMastered: false };
  }
  
  return {
    stars: Math.min(stat.successCount, MASTERY_THRESHOLD),
    total: MASTERY_THRESHOLD,
    isMastered: stat.isMastered,
  };
}

/**
 * Get overall completion percentage
 * Useful for profile stats display
 */
export function getOverallProgress(playlist: OneTapPlaylist): {
  masteredCount: number;
  totalWords: number;
  percentComplete: number;
} {
  const totalWords = oneTapPool.length;
  const masteredCount = playlist.masteredWords.length;
  const percentComplete = Math.round((masteredCount / totalWords) * 100);
  
  return { masteredCount, totalWords, percentComplete };
}

/**
 * Reset a word's progress (for testing or if child regresses)
 */
export async function resetWordProgress(
  userId: string, 
  wordId: string
): Promise<void> {
  const playlistRef = doc(db, 'users', userId, 'onetap_progress', 'playlist');
  
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(playlistRef);
    if (!snapshot.exists()) return;
    
    const playlist = snapshot.data() as OneTapPlaylist;
    
    if (playlist.stats[wordId]) {
      playlist.stats[wordId] = {
        id: wordId,
        successCount: 0,
        failCount: 0,
        isMastered: false,
      };
      
      // If word was mastered, move it back to active deck
      if (playlist.masteredWords.includes(wordId)) {
        playlist.masteredWords = playlist.masteredWords.filter(id => id !== wordId);
        if (!playlist.activeWords.includes(wordId)) {
          playlist.activeWords.push(wordId);
        }
      }
    }
    
    transaction.set(playlistRef, playlist);
  });
}
