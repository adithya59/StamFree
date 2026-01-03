import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function BreathingBalloonScreen() {
  const [phase, setPhase] = useState<'idle' | 'inhale' | 'exhale' | 'speak'>('idle');
  const [feedback, setFeedback] = useState('Get ready to breathe with the balloon! 🎈');
  const [hasBreathed, setHasBreathed] = useState(false);

  // Animation values
  const balloonScale = useRef(new Animated.Value(1)).current;
  const balloonOpacity = useRef(new Animated.Value(1)).current;

  const startBreathing = () => {
    setHasBreathed(false);
    runBreathingCycle();
  };

  const runBreathingCycle = () => {
    setPhase('inhale');
    setFeedback('Breathe in slowly... 🌬️');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.timing(balloonScale, {
      toValue: 2.5,
      duration: 4000,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setPhase('exhale');
        setFeedback('Now, breathe out gently... 😌');
        
        Animated.timing(balloonScale, {
          toValue: 1.2,
          duration: 4000,
          useNativeDriver: true,
        }).start(({ finished: exhaled }) => {
          if (exhaled) {
            setPhase('speak');
            setFeedback('Great breath! Now say "POP"! 💥');
            setHasBreathed(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        });
      }
    });
  };

  const handleSpeak = () => {
    if (!hasBreathed) {
      setFeedback('Wait! Take a deep breath first. 🎈');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Simulate speech detection
    setFeedback('POP! Wonderful! 🌟');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Balloon "pops" or resets
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
        balloonScale.setValue(1);
        balloonOpacity.setValue(1);
        setPhase('idle');
        setHasBreathed(false);
        setFeedback('Want to try again? 🎈');
      }, 1000);
    });
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
          <Text style={styles.title}>Breathing Balloon</Text>
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
            ) : (
              <TouchableOpacity 
                style={[
                  styles.speakButton, 
                  !hasBreathed && styles.buttonDisabled
                ]} 
                onPress={handleSpeak}
                disabled={phase !== 'speak'}
              >
                <Ionicons name="mic" size={40} color="white" />
                <Text style={styles.buttonText}>SAY POP</Text>
              </TouchableOpacity>
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
  },
  startButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 10,
  },
  speakButton: {
    backgroundColor: '#FF9800',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
