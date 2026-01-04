/**
 * useWordDeck Hook
 * Manages Word Deck state for One-Tap game UI
 * Handles loading active cards, tracking progress, updating after sessions
 */

import {
    getActiveWordDetails,
    getOneTapPlaylist,
    getOverallProgress,
    getWordProgress,
    updateOneTapProgress
} from '@/services/oneTapPlaylist';
import type { OneTapContentItem } from '@/services/seedOneTap';
import type { OneTapPlaylist, OneTapWordStats } from '@/types/onetap';
import { useEffect, useState } from 'react';

interface WordDeckState {
  playlist: OneTapPlaylist | null;
  activeCards: OneTapContentItem[];
  loading: boolean;
  error: string | null;
}

interface WordProgress {
  wordId: string;
  stars: number;
  total: number;
  isMastered: boolean;
}

export function useWordDeck(userId: string) {
  const [state, setState] = useState<WordDeckState>({
    playlist: null,
    activeCards: [],
    loading: true,
    error: null,
  });

  // Load initial playlist
  useEffect(() => {
    loadPlaylist();
  }, [userId]);

  const loadPlaylist = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const playlist = await getOneTapPlaylist(userId);
      const activeCards = getActiveWordDetails(playlist);
      
      setState({
        playlist,
        activeCards,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load Word Deck:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load word deck',
      }));
    }
  };

  /**
   * Submit session results and get updated playlist
   * Returns newly mastered words and new card promotions for animations
   */
  const submitResults = async (
    results: { wordId: string; passed: boolean }[]
  ): Promise<{
    newlyMastered: string[];
    promotions: Array<{ oldWord: string; newWord: string }>;
  }> => {
    if (!state.playlist) {
      throw new Error('Playlist not loaded');
    }

    try {
      const { playlist, newlyMastered, promotions } = await updateOneTapProgress(
        userId,
        results
      );

      // Update local state with new playlist
      const activeCards = getActiveWordDetails(playlist);
      
      setState({
        playlist,
        activeCards,
        loading: false,
        error: null,
      });

      return { newlyMastered, promotions };
    } catch (error) {
      console.error('Failed to update progress:', error);
      throw error;
    }
  };

  /**
   * Get progress for all active words
   * Returns star counts for UI display
   */
  const getActiveProgress = (): WordProgress[] => {
    if (!state.playlist) return [];

    return state.activeCards.map(card => ({
      wordId: card.id,
      ...getWordProgress(state.playlist!, card.id),
    }));
  };

  /**
   * Get progress for a specific word
   */
  const getWordStars = (wordId: string): WordProgress => {
    if (!state.playlist) {
      return { wordId, stars: 0, total: 3, isMastered: false };
    }

    return {
      wordId,
      ...getWordProgress(state.playlist, wordId),
    };
  };

  /**
   * Get overall collection progress
   */
  const getCollectionStats = () => {
    if (!state.playlist) {
      return { masteredCount: 0, totalWords: 0, percentComplete: 0 };
    }

    return getOverallProgress(state.playlist);
  };

  /**
   * Get specific word stats (success/fail counts)
   */
  const getWordStats = (wordId: string): OneTapWordStats | null => {
    if (!state.playlist) return null;
    return state.playlist.stats[wordId] || null;
  };

  return {
    // State
    playlist: state.playlist,
    activeCards: state.activeCards,
    loading: state.loading,
    error: state.error,

    // Actions
    loadPlaylist,
    submitResults,

    // Progress queries
    getActiveProgress,
    getWordStars,
    getCollectionStats,
    getWordStats,
  };
}
