import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech'; // Ensure expo-speech is installed
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { startRecording, stopRecording } from '../../services/audioService';

export default function TalkingTurtle() {
  const words = ['Apple', 'Banana', 'Tiger', 'Sun']; // The word list for the level
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState('🐢 Help the turtle reach the end of the road!');
  const [isFinished, setIsFinished] = useState(false);
  
  const targetWord = words[currentIndex];
  
  // Turtle positioning
  const verticalAnim = useRef(new Animated.Value(-200)).current; 
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  
  // Progress Bar Width
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Update progress bar whenever the index changes
    Animated.timing(progressAnim, {
      toValue: (currentIndex / words.length) * 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const handleSpeakResult = async () => {
    const audioUri = await stopRecording();
    if (!audioUri) return;

    try {
      // TODO: Implement transcription using backend API
      // For now, auto-succeed for testing
      const isCorrect = true;

      if (isCorrect) {
        processSuccess();
      } else {
        setFeedback('Almost! Try saying it again slowly 🐢');
        Speech.speak('Almost! Try saying it again slowly.'); // Turtle voice
      }
    } catch (error) {
      setFeedback("The jungle is noisy! Try again? 🐢");
    }
  };

  const processSuccess = () => {
    setFeedback('WOW! You said it! 🐢 JUMP!');
    Speech.speak('Perfect! Watch me go!');

    // Move turtle forward
    const currentVertical = (verticalAnim as any)._value || -200 + (currentIndex * 120);
    const currentScale = (scaleAnim as any)._value || 0.6 + (currentIndex * 0.15);
    
    Animated.parallel([
      Animated.timing(verticalAnim, {
        toValue: currentVertical + 120,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: currentScale + 0.15,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (currentIndex + 1 < words.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsFinished(true); // Game Complete!
      }
    });
  };

  return (
    <ImageBackground source={require('../../assets/images/jungle.jpg')} style={styles.container}>
      
      {/* Progress Bar at Top */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%']
          }) }]} />
        </View>
        <Text style={styles.progressText}>Step {currentIndex + 1} of {words.length}</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.instruction}>Can you say...</Text>
        <Text style={styles.targetWordText}>{targetWord}</Text>
      </View>

      <Animated.View style={[
        styles.turtleContainer, 
        { transform: [{ translateY: verticalAnim }, { scale: scaleAnim }] }
      ]}>
        <Image source={require('../../assets/images/turtle.png')} style={styles.turtle} />
      </Animated.View>

      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackText}>{feedback}</Text>
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={[styles.roundButton, styles.speakBtn]} onPress={startRecording}>
          <Ionicons name="mic" size={40} color="white" />
          <Text style={styles.btnLabel}>SPEAK</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.roundButton, styles.doneBtn]} onPress={handleSpeakResult}>
          <Ionicons name="checkmark-done" size={40} color="white" />
          <Text style={styles.btnLabel}>DONE</Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={isFinished} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🏆</Text>
            <Text style={styles.modalTitle}>Level Complete!</Text>
            <Text style={styles.modalSub}>The turtle made it home!</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setIsFinished(false)}>
              <Text style={styles.modalBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  progressWrapper: { width: '80%', marginTop: 50, alignItems: 'center' },
  progressBarContainer: { height: 15, width: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 10 },
  progressText: { color: 'white', marginTop: 5, fontWeight: 'bold' },
  header: { marginTop: 20, alignItems: 'center' },
  instruction: { color: 'white', fontSize: 18, fontWeight: '600' },
  targetWordText: { fontSize: 55, fontWeight: 'bold', color: '#FFF' },
  turtleContainer: { position: 'absolute', top: '40%' },
  turtle: { width: 150, height: 150, resizeMode: 'contain' },
  feedbackContainer: { backgroundColor: 'rgba(255,255,255,0.8)', padding: 15, borderRadius: 25, width: '85%', marginBottom: 20 },
  feedbackText: { color: '#2E7D32', fontSize: 18, textAlign: 'center', fontWeight: 'bold' },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', marginBottom: 40 },
  roundButton: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  speakBtn: { backgroundColor: '#4CAF50' },
  doneBtn: { backgroundColor: '#FF9800' },
  btnLabel: { color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 40, borderRadius: 30, alignItems: 'center' },
  modalEmoji: { fontSize: 60 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', marginVertical: 10 },
  modalSub: { fontSize: 18, color: '#666', marginBottom: 20 },
  modalBtn: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20 },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});