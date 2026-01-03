/**
 * WordDeckDisplay Component
 * Displays the 5 active word cards with progress stars
 * Visual: Card collection with star progress (⭐⭐⚪ - needs 1 more!)
 */

import type { OneTapContentItem } from '@/services/seedOneTap';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WordCardProps {
  word: OneTapContentItem;
  stars: number;
  total: number;
  isMastered: boolean;
  isCurrentWord?: boolean;
  onPress?: () => void;
}

function WordCard({ word, stars, total, isMastered, isCurrentWord, onPress }: WordCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isMastered && styles.cardMastered,
        isCurrentWord && styles.cardActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      {/* Star Progress Bar */}
      <View style={styles.starRow}>
        {Array.from({ length: total }).map((_, index) => (
          <Text key={index} style={styles.star}>
            {index < stars ? '⭐' : '⚪'}
          </Text>
        ))}
      </View>

      {/* Word Display */}
      <View style={styles.wordContainer}>
        <Text style={[styles.wordText, isMastered && styles.wordTextMastered]}>
          {word.text}
        </Text>
        
        {/* Syllable Breakdown */}
        <View style={styles.syllableRow}>
          {word.syllables.map((syl, index) => (
            <Text key={index} style={styles.syllableText}>
              {syl}
              {index < word.syllables.length - 1 && '·'}
            </Text>
          ))}
        </View>
      </View>

      {/* Status Badge */}
      {isMastered ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✓ Mastered</Text>
        </View>
      ) : stars > 0 ? (
        <View style={[styles.badge, styles.badgeProgress]}>
          <Text style={styles.badgeText}>{total - stars} more!</Text>
        </View>
      ) : null}

      {/* Current Word Indicator */}
      {isCurrentWord && !isMastered && (
        <View style={styles.currentIndicator}>
          <Text style={styles.currentText}>▶ Current</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface WordDeckDisplayProps {
  words: OneTapContentItem[];
  progressData: Array<{ wordId: string; stars: number; total: number; isMastered: boolean }>;
  currentWordId?: string;
  onWordPress?: (wordId: string) => void;
}

export function WordDeckDisplay({ 
  words, 
  progressData, 
  currentWordId, 
  onWordPress 
}: WordDeckDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🃏 My Word Deck</Text>
        <Text style={styles.subtitle}>Master each word 3 times!</Text>
      </View>

      <View style={styles.cardGrid}>
        {words.map(word => {
          const progress = progressData.find(p => p.wordId === word.id) || {
            stars: 0,
            total: 3,
            isMastered: false,
          };

          return (
            <WordCard
              key={word.id}
              word={word}
              stars={progress.stars}
              total={progress.total}
              isMastered={progress.isMastered}
              isCurrentWord={currentWordId === word.id}
              onPress={onWordPress ? () => onWordPress(word.id) : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E5077',
  },
  subtitle: {
    fontSize: 14,
    color: '#7A9CC6',
    marginTop: 4,
  },
  cardGrid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  cardMastered: {
    backgroundColor: '#FFD700',
    borderColor: '#FFA500',
  },
  cardActive: {
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },
  star: {
    fontSize: 24,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E5077',
    marginBottom: 4,
  },
  wordTextMastered: {
    color: '#8B6508',
  },
  syllableRow: {
    flexDirection: 'row',
    gap: 4,
  },
  syllableText: {
    fontSize: 14,
    color: '#7A9CC6',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 8,
  },
  badgeProgress: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
