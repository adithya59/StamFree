/**
 * Balloon Game (Easy Onset) Screen
 * Scaffold for wiring Pufferfish-themed exercise
 */

import { BalloonAsset } from '@/components/balloon/BalloonAsset';
import { BalloonEngine } from '@/components/balloon/BalloonEngine';
import { useBalloonSession } from '@/hooks/useBalloonSession';
import { BalloonLevel } from '@/types/balloon';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// TODO: Replace with actual content from Firestore
const MOCK_LEVEL: BalloonLevel = {
  levelId: 'balloon-test-1',
  tier: 1,
  phonemeCode: 'AA',
  targetWord: 'Puppy',
  maxAttackSlope: 0.5,
  xpReward: 25,
};

export default function BalloonGameScreen() {
  const [level, setLevel] = useState<BalloonLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlying, setIsFlying] = useState(false);

  const {
    sessionState,
    startRecording,
    stopRecording,
    processAmplitudeSample,
    reset,
  } = useBalloonSession({
    level: level || MOCK_LEVEL,
    onSuccess: async (metrics) => {
      console.log('✅ Balloon Success!', metrics);

      // Award XP and save to Firestore
      try {
        const { updateUserStatsOnActivity } = await import('@/services/statsService');
        await updateUserStatsOnActivity(level?.xpReward || MOCK_LEVEL.xpReward);
        console.log(`Awarded ${level?.xpReward || MOCK_LEVEL.xpReward} XP`);
      } catch (error) {
        console.error('Failed to update stats:', error);
      }

      // Show flying away animation
      setIsFlying(true);

      // TODO: Save session metrics to Firestore
      // TODO: Navigate to results screen

      setTimeout(() => {
        reset();
        setIsFlying(false);
      }, 2000);
    },
    onFail: (metrics) => {
      console.log('❌ Balloon Failed', metrics);
      // TODO: Show feedback, retry option
      setTimeout(() => {
        reset();
      }, 1500);
    },
  });

  // Load level from content bank
  useEffect(() => {
    const loadLevel = async () => {
      try {
        // TODO: Fetch level from Firestore
        // const fetchedLevel = await getBalloonLevel();
        setLevel(MOCK_LEVEL);
      } catch (error) {
        console.error('Failed to load level:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLevel();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset(); // Clear any pending state
    };
  }, [reset]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7BA7" />
        <Text style={styles.loadingText}>Loading level...</Text>
      </View>
    );
  }

  if (!level) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No level available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🐡 Balloon Game</Text>
        <Text style={styles.subtitle}>Blow gently and watch it grow!</Text>
      </View>

      {/* Target Phoneme */}
      <View style={styles.infoContainer}>
        <Text style={styles.targetLabel}>Practice Phoneme:</Text>
        <Text style={styles.targetPhoneme}>{level.phonemeCode}</Text>
        {level.targetWord && (
          <Text style={styles.targetWord}>{level.targetWord}</Text>
        )}
      </View>

      {/* Soft Onset Guidance */}
      <View style={styles.guidanceContainer}>
        <Text style={styles.guidanceTitle}>💡 Tips for Soft Onset:</Text>
        <Text style={styles.guidanceText}>
          • Start gently at a low volume
        </Text>
        <Text style={styles.guidanceText}>
          • Gradually increase breath pressure
        </Text>
        <Text style={styles.guidanceText}>
          • Avoid a hard explosive start
        </Text>
      </View>

      {/* Balloon Engine with Asset */}
      <BalloonEngine
        isReady={sessionState.isReady}
        isRecording={sessionState.isRecording}
        onRecordingStart={startRecording}
        onRecordingStop={stopRecording}
        onAmplitudeSample={processAmplitudeSample}
        onError={(error) => console.error('Recording error:', error)}
      >
        {({ onTap, isRecording, inflationLevel }) => (
          <View style={styles.gameArea}>
            {/* Pufferfish Asset */}
            <BalloonAsset
              inflationLevel={inflationLevel}
              hasPopped={sessionState.hasPopped}
              isFlying={isFlying}
            />

            {/* Inflation Meter */}
            <View style={styles.meterContainer}>
              <View style={styles.meterBackground}>
                <View
                  style={[
                    styles.meterFill,
                    { width: `${inflationLevel * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.meterText}>
                {sessionState.hasPopped
                  ? '💥 Popped!'
                  : `${Math.round(inflationLevel * 100)}%`}
              </Text>
            </View>

            {/* Start Button */}
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
                {isRecording ? '🎤 Blowing...' : '👆 START'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </BalloonEngine>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A7BA7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
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
  infoContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  targetLabel: {
    fontSize: 14,
    color: '#7A9CC6',
    marginBottom: 4,
  },
  targetPhoneme: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2E5077',
    marginBottom: 4,
  },
  targetWord: {
    fontSize: 18,
    color: '#4A7BA7',
  },
  guidanceContainer: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF8C00',
    marginBottom: 8,
  },
  guidanceText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
  gameArea: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  meterContainer: {
    width: '100%',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  meterBackground: {
    height: 30,
    backgroundColor: '#D0D0D0',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 8,
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 15,
  },
  meterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A7BA7',
    textAlign: 'center',
  },
  tapButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    marginVertical: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
});
