/**
 * OneTapPrompt Component
 * "Robot & Parrot" TTS strategy: Break down syllables slowly, then say whole word
 * Chained Prompting: Show syllables separately, record together
 */

import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface OneTapPromptProps {
  word: string;
  syllables: string[];
  onComplete: () => void; // Called when prompt finishes
  autoPlay?: boolean;
}

export function OneTapPrompt({ word, syllables, onComplete, autoPlay = true }: OneTapPromptProps) {
  const [currentSyllableIndex, setCurrentSyllableIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (autoPlay) {
      playRhythmPrompt();
    }
  }, [word, syllables]);

  const playRhythmPrompt = async () => {
    setIsPlaying(true);
    
    // 1. Break it down (Robot Style) - Slow with pauses
    for (let i = 0; i < syllables.length; i++) {
      setCurrentSyllableIndex(i);
      
      // Speak syllable slowly
      await Speech.speak(syllables[i], { 
        rate: 0.7,
        pitch: 1.0,
        language: 'en-US'
      });
      
      // Wait for speech to complete + small pause
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // 2. Clear highlight
    setCurrentSyllableIndex(-1);
    await new Promise(resolve => setTimeout(resolve, 300));

    // 3. Put it together (Natural Style) - Normal speed
    await Speech.speak(`Now say ${word}`, { 
      rate: 1.0,
      pitch: 1.0,
      language: 'en-US'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsPlaying(false);
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* Phase 1: Loading - Wait, don't speak yet! */}
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseLabel}>📥 LOADING PHASE</Text>
        <Text style={styles.phaseInstruction}>Listen and wait... Don't speak yet!</Text>
      </View>
      
      <View style={styles.syllableRow}>
        {syllables.map((syl, index) => (
          <View 
            key={index}
            style={[
              styles.syllableCard,
              currentSyllableIndex === index && styles.syllableCardActive
            ]}
          >
            <Text style={[
              styles.syllableText,
              currentSyllableIndex === index && styles.syllableTextActive
            ]}>
              {syl}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.wholeWordContainer}>
        <Text style={styles.wholeWordLabel}>Whole word (say it smoothly):</Text>
        <Text style={styles.wholeWord}>{word}</Text>
      </View>

      {isPlaying ? (
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>🤫</Text>
          <Text style={styles.statusText}>Shhh... Buffer loading!</Text>
          <Text style={styles.statusSubtext}>Don't speak yet - just listen</Text>
        </View>
      ) : (
        <View style={[styles.statusContainer, styles.statusReady]}>
          <Text style={styles.statusIcon}>✅</Text>
          <Text style={styles.statusTextReady}>Ready! Now you can speak!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  phaseHeader: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    width: '100%',
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  phaseInstruction: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  syllableRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  syllableCard: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    minWidth: 70,
    alignItems: 'center',
  },
  syllableCardActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFA500',
    transform: [{ scale: 1.1 }],
  },
  syllableText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  syllableTextActive: {
    color: '#000',
  },
  wholeWordContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  wholeWordLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  wholeWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
    marginTop: 10,
  },
  statusReady: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 4,
  },
  statusTextReady: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
