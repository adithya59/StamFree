import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

export default function OneTapWordScreen() {
  const [canSpeak, setCanSpeak] = useState(true);
  const [feedback, setFeedback] = useState('Tap once and say the word smoothly! 🦁');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const words = ['Lion', 'Leopard', 'Light', 'Lamp'];
  const [wordIndex, setWordIndex] = useState(0);
  const currentWord = words[wordIndex];

  // Animation values
  const cardScale = useRef(new Animated.Value(1)).current;
  const micScale = useRef(new Animated.Value(1)).current;

  const handleSpeak = () => {
    if (!canSpeak) return;

    setCanSpeak(false);
    setFeedback('Listening... 👂');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Pulse the mic
    Animated.sequence([
      Animated.timing(micScale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
      Animated.timing(micScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Simulate analysis delay
    setTimeout(() => {
      processResult();
    }, 2000);
  };

  const processResult = () => {
    // Scaffolded success
    setIsSuccess(true);
    setFeedback('Great! You said it once and clearly. 🌟');
    Speech.speak(`Wonderful! You said ${currentWord} perfectly.`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate card
    Animated.spring(cardScale, {
      toValue: 1.1,
      friction: 3,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true }).start();
    });
  };

  const nextWord = () => {
    if (wordIndex < words.length - 1) {
      setWordIndex(wordIndex + 1);
      setCanSpeak(true);
      setIsSuccess(false);
      setFeedback('Ready for the next one? Tap once! 🦁');
    } else {
      setFeedback('You finished all the words! 🏆');
    }
  };

  const reset = () => {
    setCanSpeak(true);
    setIsSuccess(false);
    setFeedback('Let\'s try again! Tap once and speak. 🦁');
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/jungle.jpg')} 
      style={styles.container}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>One-Tap Word</Text>
          <TouchableOpacity onPress={reset} style={styles.resetButton}>
            <MaterialCommunityIcons name="refresh" size={28} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.gameArea}>
          <Animated.View style={[styles.wordCard, { transform: [{ scale: cardScale }] }]}>
            <Text style={styles.label}>Can you say...</Text>
            <Text style={styles.wordText}>{currentWord}</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>

          <View style={styles.controls}>
            {!isSuccess ? (
              <Animated.View style={{ transform: [{ scale: micScale }] }}>
                <TouchableOpacity 
                  style={[styles.micButton, !canSpeak && styles.micDisabled]} 
                  onPress={handleSpeak}
                  disabled={!canSpeak}
                >
                  <MaterialCommunityIcons 
                    name={canSpeak ? "microphone" : "microphone-off"} 
                    size={50} 
                    color="white" 
                  />
                  <Text style={styles.buttonLabel}>{canSpeak ? "SPEAK" : "WAIT"}</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <TouchableOpacity style={styles.nextButton} onPress={nextWord}>
                <Text style={styles.nextButtonText}>NEXT WORD</Text>
                <Ionicons name="arrow-forward" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
  },
  resetButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordCard: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  label: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  wordText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  feedbackCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    marginBottom: 20,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    width: '100%',
  },
  micButton: {
    backgroundColor: '#1a73e8',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  micDisabled: {
    backgroundColor: '#9E9E9E',
    elevation: 0,
  },
  buttonLabel: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 2,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    gap: 10,
    elevation: 5,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
