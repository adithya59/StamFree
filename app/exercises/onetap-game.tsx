/**
 * One-Tap Game (Impulse Control) Screen
 * Scaffold for wiring Owl-themed exercise
 */

import { CooldownOverlay } from '@/components/onetap/CooldownOverlay';
import { OneTapEngine } from '@/components/onetap/OneTapEngine';
import { OneTapOwl } from '@/components/onetap/OneTapOwl';
import { OneTapPrompt } from '@/components/onetap/OneTapPrompt';
import { WordDeckDisplay } from '@/components/onetap/WordDeckDisplay';
import { auth } from '@/config/firebaseConfig';
import { useOneTapSession } from '@/hooks/useOneTapSession';
import { useWordDeck } from '@/hooks/useWordDeck';
import { OneTapLevel } from '@/types/onetap';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO: Replace with actual content from Firestore
// Using Tier 2 word for demo (3 syllables)
const MOCK_LEVEL: OneTapLevel = {
  levelId: 'onetap-test-1',
  tier: 2,
  targetWord: 'Spaghetti',
  syllables: ['Spa', 'ghet', 'ti'],
  syllableCount: 3,
  xpReward: 25,
  maxRepetitions: 0,
  category: 'food',
};

export default function OneTapGameScreen() {
  const [level, setLevel] = useState<OneTapLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [owlState, setOwlState] = useState<'sleeping' | 'ready' | 'success' | 'flying'>('sleeping');
  const [promptComplete, setPromptComplete] = useState(false); // TTS prompt finished
  const [showWordDeck, setShowWordDeck] = useState(true); // Show deck before starting

  // Word Deck integration
  const {
    activeCards,
    loadPlaylist,
    submitResults,
    getActiveProgress,
    loading: deckLoading,
  } = useWordDeck(auth.currentUser?.uid || 'demo-user');

  const {
    sessionState,
    startRecording,
    stopRecording,
    reset,
  } = useOneTapSession({
    level: level || MOCK_LEVEL,
    onSuccess: async (metrics) => {
      console.log('✅ One-Tap Success!', metrics);
      setOwlState('success'); // Head tilt reaction
      
      // Award XP and save to Firestore
      try {
        const { updateUserStatsOnActivity } = await import('@/services/statsService');
        await updateUserStatsOnActivity(level?.xpReward || MOCK_LEVEL.xpReward);
        console.log(`Awarded ${level?.xpReward || MOCK_LEVEL.xpReward} XP`);
      } catch (error) {
        console.error('Failed to update stats:', error);
      }

      // TODO: Save session metrics to Firestore
      // TODO: Navigate to results screen
      
      setTimeout(() => {
        reset();
        setOwlState('ready');
      }, 2000);
    },
    onFail: (metrics) => {
      console.log('❌ One-Tap Failed', metrics);
      setOwlState('flying'); // Owl flies away on fail
      // TODO: Show feedback, retry option
    },
  });

  // Load Word Deck playlist
  useEffect(() => {
    const loadDeck = async () => {
      try {
        await loadPlaylist();
        
        // Load first word from active deck
        if (activeCards.length > 0) {
          const firstWord = activeCards[0];
          setLevel({
            levelId: `onetap-${firstWord.id}`,
            tier: firstWord.tier,
            targetWord: firstWord.text,
            syllables: firstWord.syllables,
            syllableCount: firstWord.syllables.length,
            xpReward: firstWord.tier * 10,
            maxRepetitions: 0,
            category: firstWord.category,
          });
        } else {
          // Fallback to mock if deck is empty
          setLevel(MOCK_LEVEL);
        }
        
        setOwlState('sleeping');
        setPromptComplete(false);
      } catch (error) {
        console.error('Failed to load deck:', error);
        setLevel(MOCK_LEVEL);
      } finally {
        setLoading(false);
      }
    };

    loadDeck();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset(); // Clear any pending timers/state
    };
  }, [reset]);

  // Bring owl back after flying away (when cooldown ends)
  useEffect(() => {
    if (owlState === 'flying' && sessionState.cooldownRemaining === 0 && sessionState.isReady) {
      // Cooldown finished, owl comes back
      setTimeout(() => setOwlState('ready'), 1000); // Wait for flying animation to complete
    }
  }, [owlState, sessionState.cooldownRemaining, sessionState.isReady]);

  // Handle prompt completion - wake owl when ready
  const handlePromptComplete = () => {
    setPromptComplete(true);
    setOwlState('ready'); // Wake owl after hearing the prompt
  };

  // Debug logging
  useEffect(() => {
    console.log('🎮 OneTap Game State:', {
      loading,
      hasLevel: !!level,
      showWordDeck,
      activeCardsCount: activeCards.length,
      promptComplete,
      owlState,
    });
  }, [loading, level, showWordDeck, activeCards.length, promptComplete, owlState]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {loading && (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#4A7BA7" />
          <Text style={styles.loadingText}>Loading level...</Text>
        </View>
      )}

      {!loading && !level && (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.errorText}>No level available</Text>
        </View>
      )}

      {!loading && level && (
        <View style={{ flex: 1 }}>
          {/* Floating Header with Back Button */}
          <View style={styles.floatingHeader} pointerEvents="box-none">
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Word Deck Display (before starting game) */}
          {showWordDeck && (
            <ScrollView style={styles.deckContainer} contentContainerStyle={{ paddingBottom: 40 }}>
              {activeCards.length > 0 ? (
                <>
                  <WordDeckDisplay
                    words={activeCards}
                    progressData={getActiveProgress()}
                    currentWordId={level?.levelId.replace('onetap-', '')}
                  />
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={() => {
                      console.log('Start Practice button pressed');
                      setShowWordDeck(false);
                    }}
                  >
                    <Text style={styles.startButtonText}>Start Practice</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={styles.loadingText}>Loading Word Deck...</Text>
                  <TouchableOpacity
                    style={[styles.startButton, { marginTop: 20 }]}
                    onPress={() => {
                      console.log('Skip to game button pressed');
                      setShowWordDeck(false);
                    }}
                  >
                    <Text style={styles.startButtonText}>Skip to Game</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {/* Game Screen (after clicking Start) */}
          {!showWordDeck && (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>🦉 One-Tap Challenge</Text>
                <Text style={styles.subtitle}>Say it once, say it right!</Text>
              </View>

              {/* Chained Prompting: Syllable Breakdown with TTS */}
              {!promptComplete && (
                <OneTapPrompt
                  word={level.targetWord}
                  syllables={level.syllables}
                  onComplete={handlePromptComplete}
                  autoPlay={true}
                />
              )}

              {/* Target Word Display (after prompt) */}
              {promptComplete && (
                <View style={styles.wordContainer}>
                  <Text style={styles.targetWord}>{level.targetWord}</Text>
                  <View style={styles.syllableBreakdown}>
                    {level.syllables.map((syl, index) => (
                      <Text key={index} style={styles.syllableChip}>{syl}</Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Attempts Counter */}
              {promptComplete && (
                <View style={styles.attemptsContainer}>
                  <Text style={styles.attemptsText}>
                    Attempts: {sessionState.attempts}
                  </Text>
                </View>
              )}

              {/* Owl Animation */}
              <View style={styles.owlContainer}>
                <OneTapOwl gameState={owlState} />
                <Text style={styles.owlStatusText}>
                  {sessionState.isRecording 
                    ? 'Listening...' 
                    : owlState === 'flying' 
                    ? 'Flew away!' 
                    : owlState === 'sleeping' 
                    ? '📥 Loading motor plan...' 
                    : '✅ Motor plan ready!'}
                </Text>
              </View>

              {/* Phase Indicator */}
              {!promptComplete && (
                <View style={styles.phaseIndicator}>
                  <Text style={styles.phaseText}>🚫 PHASE 1: WAIT</Text>
                  <Text style={styles.phaseSubtext}>Button disabled - No speaking yet!</Text>
                </View>
              )}

              {promptComplete && !sessionState.isRecording && sessionState.isReady && (
                <View style={[styles.phaseIndicator, styles.phaseIndicatorReady]}>
                  <Text style={[styles.phaseText, styles.phaseTextReady]}>✅ PHASE 2: GO!</Text>
                  <Text style={styles.phaseSubtext}>Tap the green button now!</Text>
                </View>
              )}

              {/* One-Tap Engine (only shown after prompt) */}
              {promptComplete && (
                <OneTapEngine
                  isReady={sessionState.isReady}
                  isRecording={sessionState.isRecording}
                  onRecordingStart={startRecording}
                  onRecordingStop={stopRecording}
                  onError={(error) => console.error('Recording error:', error)}
                >
                  {({ onTap, isRecording }) => (
                    <TouchableOpacity
                      style={[
                        styles.tapButton,
                        !sessionState.isReady && styles.tapButtonDisabled,
                        isRecording && styles.tapButtonRecording,
                      ]}
                      onPress={onTap}
                      disabled={!sessionState.isReady || isRecording}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.tapButtonText}>
                        {isRecording 
                          ? '🎤 Recording... Say it smooth!' 
                          : !sessionState.isReady 
                          ? '🚫 Wait for prompt...' 
                          : '👆 TAP ONCE - Say the whole word'}
                      </Text>
                      {sessionState.isReady && !isRecording && (
                        <Text style={styles.tapButtonSubtext}>(No repeating!)</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </OneTapEngine>
              )}

              {/* Cooldown Overlay */}
              <CooldownOverlay
                cooldownRemaining={sessionState.cooldownRemaining}
                visible={sessionState.cooldownRemaining > 0}
              />

              {/* Instructions */}
              {promptComplete && (
                <View style={styles.instructions}>
                  <Text style={styles.instructionsTitle}>ℹ️ How It Works:</Text>
                  <Text style={styles.instructionText}>
                    • Wait for the prompt to finish (Phase 1)
                  </Text>
                  <Text style={styles.instructionText}>
                    • Tap ONCE when button turns green (Phase 2)
                  </Text>
                  <Text style={styles.instructionText}>
                    • Say the WHOLE word smoothly (not syllables!)
                  </Text>
                  <Text style={styles.instructionText}>
                    • No repeating: "Spa-spa-ghetti" = Fail ❌
                  </Text>
                  <Text style={styles.instructionText}>
                    • Smooth flow: "Spaghetti" = Success ✅
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    padding: 20,
  },
  floatingHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
    backgroundColor: 'transparent',
    zIndex: 30,
  },
  deckContainer: {
    flex: 1,
    marginTop: 10,
    zIndex: 1,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E5077',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A7BA7',
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E5077',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#4A7BA7',
  },
  wordContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  targetWord: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2E5077',
    marginBottom: 8,
  },
  syllableBreakdown: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  syllableChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  syllableInfo: {
    fontSize: 16,
    color: '#7A9CC6',
  },
  attemptsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  attemptsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A7BA7',
  },
  owlContainer: {
    alignItems: 'center',
    marginVertical: 24,
    minHeight: 300,
  },
  owlStatusText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A7BA7',
    marginTop: -50,
  },
  phaseIndicator: {
    backgroundColor: '#FFF3E0',
    borderWidth: 3,
    borderColor: '#FF9800',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  phaseIndicatorReady: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  phaseText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 4,
  },
  phaseTextReady: {
    color: '#2E7D32',
  },
  phaseSubtext: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  tapButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tapButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  tapButtonRecording: {
    backgroundColor: '#FF6B6B',
  },
  tapButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tapButtonSubtext: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    fontStyle: 'italic',
  },
  instructions: {
    marginTop: 'auto',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E5077',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#4A7BA7',
    marginBottom: 8,
  },
});
