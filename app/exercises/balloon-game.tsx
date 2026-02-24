import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Adjusted for 6-12 year olds (3 seconds per phase)
const INHALE_DURATION = 3000;
const EXHALE_DURATION = 3000;

export default function BreathingBalloonScreen() {
  const [phase, setPhase] = useState<'idle' | 'inhale' | 'exhale' | 'approval'>('idle');
  const [feedback, setFeedback] = useState('Parents: Please watch your child breathe. 🎈');
  const [hasCompleatedCycle, setHasCompleatedCycle] = useState(false);

  // Animation values
  const balloonScale = useRef(new Animated.Value(1)).current;
  const balloonOpacity = useRef(new Animated.Value(1)).current;

  const startBreathing = () => {
    setHasCompleatedCycle(false);
    runBreathingCycle();
  };

  const runBreathingCycle = () => {
    setPhase('inhale');
    setFeedback('Breathe in slowly (nose)... 🌬️');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.timing(balloonScale, {
      toValue: 2.5,
      duration: INHALE_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setPhase('exhale');
        setFeedback('Now, breathe out gently (mouth)... 😌');

        Animated.timing(balloonScale, {
          toValue: 1.2,
          duration: EXHALE_DURATION,
          useNativeDriver: true,
        }).start(({ finished: exhaled }) => {
          if (exhaled) {
            setPhase('approval');
            setFeedback('Parents: Did they do it correctly?');
            setHasCompleatedCycle(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        });
      }
    });
  };

  const handleParentApproval = (approved: boolean) => {
    if (approved) {
      // Success - Pop the balloon
      setFeedback('POP! wonderful! 🌟');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Balloon "pops"
      Animated.sequence([
        Animated.timing(balloonScale, {
          toValue: 3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(balloonOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          // Reset
          balloonScale.setValue(1);
          balloonOpacity.setValue(1);
          setPhase('idle');
          setFeedback('Great Job! Ready for another? 🎈');
        }, 1500);
      });
    } else {
      // Retry - Reset without pop
      setFeedback('Let\'s try together again! 🔄');
      balloonScale.setValue(1);
      setPhase('idle');
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/sky.jpg')}
      style={styles.container}
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Balloon Breath</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.gameArea}>
          <Animated.View style={[
            styles.balloonContainer,
            {
              transform: [{ scale: balloonScale }],
              opacity: balloonOpacity
            }
          ]}>
            <View style={styles.balloon}>
              <View style={styles.balloonShine} />
            </View>
            <View style={styles.balloonString} />
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>

          <View style={styles.controls}>
            {phase === 'idle' ? (
              <TouchableOpacity style={styles.startButton} onPress={startBreathing}>
                <Ionicons name="play" size={32} color="white" />
                <Text style={styles.buttonText}>START</Text>
              </TouchableOpacity>
            ) : phase === 'approval' ? (
              <View style={styles.approvalButtons}>
                <TouchableOpacity
                  style={[styles.approvalButton, styles.retryButton]}
                  onPress={() => handleParentApproval(false)}
                >
                  <Ionicons name="refresh" size={24} color="white" />
                  <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approvalButton, styles.successButton]}
                  onPress={() => handleParentApproval(true)}
                >
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.buttonText}>Good Job!</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.breathingIndicator}>
                <Text style={styles.breathingText}>
                  {phase === 'inhale' ? 'Inhaling...' : 'Exhaling...'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balloonContainer: {
    alignItems: 'center',
  },
  balloon: {
    width: 100,
    height: 120,
    backgroundColor: '#FF6B6B',
    borderRadius: 50,
    position: 'relative',
  },
  balloonShine: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 20,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    transform: [{ rotate: '25deg' }],
  },
  balloonString: {
    width: 2,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  feedbackCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    marginBottom: 20,
    elevation: 5,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    minHeight: 80, // Reserve space for buttons
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 10,
    elevation: 5,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  approvalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    elevation: 3,
  },
  retryButton: {
    backgroundColor: '#FF9800',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  breathingIndicator: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  breathingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
