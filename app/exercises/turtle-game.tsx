import { auth } from '@/config/firebaseConfig';
import { speak } from '@/services/tts';
import { analyzeTurtleAudio } from '@/services/turtleAnalysis';
import { getNextTurtleSession, recordTurtleResult, type TurtleContent } from '@/services/turtlePlaylist';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TurtleVideo } from '../../components/turtle/TurtleVideo';
import { startRecording, stopRecording } from '../../services/audioService';

export default function TalkingTurtle() {
  const [sessionContent, setSessionContent] = useState<TurtleContent[][]>([]);
  const [currentLap, setCurrentLap] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [feedback, setFeedback] = useState('🐢 Help the turtle reach the end of the road!');
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showLapModal, setShowLapModal] = useState(false);
  
  // Progress Bar Width
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load session content on mount
  useEffect(() => {
    const loadSession = async () => {
      if (auth.currentUser) {
        const content = await getNextTurtleSession(auth.currentUser.uid);
        if (content.length > 0) {
          setSessionContent(content);
        } else {
          // Fallback with correct literal types
          const dummyDeck: TurtleContent[] = [
            { id: 'default', text: 'Hello Turtle', wordCount: 2, tier: 1 }
          ];
          setSessionContent([dummyDeck, dummyDeck, dummyDeck]);
        }
      }
    };
    loadSession();
  }, []);

  const currentDeck = sessionContent[currentLap] || [];
  const targetItem = currentDeck[currentIndex];
  const totalLaps = sessionContent.length;
  const totalStepsPerLap = currentDeck.length || 4;
  const totalSteps = totalLaps * totalStepsPerLap;
  const currentGlobalStep = (currentLap * totalStepsPerLap) + currentIndex;

  useEffect(() => {
    if (totalSteps > 0) {
      Animated.timing(progressAnim, {
        toValue: (currentGlobalStep / totalSteps) * 100,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentGlobalStep, totalSteps]);

  // Speak the current target aloud whenever it changes
  useEffect(() => {
    if (targetItem?.text) {
      try {
        speak(targetItem.text, { type: 'prompt' });
      } catch (e) {
        // ignore TTS errors
      }
    }
  }, [targetItem?.text]);

  // Initial Loading State
  if (sessionContent.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#81C784' }]}>
        <ActivityIndicator size="large" color="white" />
        <Text style={{ marginTop: 20, color: 'white', fontSize: 18, fontWeight: 'bold' }}>Preparing your adventure...</Text>
      </View>
    );
  }

  const handleToggleRecording = async () => {
    if (!isRecording) {
      try {
        setFeedback('🐢 I am listening...');
        await startRecording();
        setIsRecording(true);
      } catch (error) {
        setFeedback("Couldn't start the mic! 🐢");
      }
    } else {
      setIsLoading(true);
      setIsRecording(false);
      const audioUri = await stopRecording();
      if (!audioUri) {
          setIsLoading(false);
          return;
      }

      try {
        setFeedback('🐢 Thinking...');
        const result = await analyzeTurtleAudio(audioUri, targetItem?.text);

        if (result) {
          const isCorrect = result.game_pass && result.clinical_pass;
          setFeedback(result.feedback);
          speak(result.feedback, { type: 'feedback' });

          if (auth.currentUser && targetItem) {
             recordTurtleResult(auth.currentUser.uid, targetItem.id, isCorrect);
          }

          if (isCorrect) {
              processSuccess();
          }
        } else {
          setFeedback("I couldn't hear you clearly. Try again? 🐢");
        }
      } catch (error) {
        setFeedback("The jungle is noisy! Try again? 🐢");
      } finally {
          setIsLoading(false);
      }
    }
  };

  const processSuccess = () => {
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < currentDeck.length) {
      // Normal step within lap
      setTimeout(() => setCurrentIndex(nextIndex), 500);
    } else {
      // Lap Finished!
      // FOR DEMO: Immediately finish session after Lap 1
      setIsFinished(true); 
      
      /* 
      // LEGACY MULTI-LAP LOGIC (Restore later)
      if (currentLap + 1 < totalLaps) {
        setShowLapModal(true); 
      } else {
        setIsFinished(true);
      }
      */
    }
  };

  const nextLap = () => {
    setShowLapModal(false);
    setCurrentLap(prev => prev + 1);
    setCurrentIndex(0);
    setFeedback("Let's keep going! New adventure! 🌟");
  };

  return (
    <View style={styles.container}>
      {/* Segmented Video Controller */}
      <TurtleVideo 
        currentStep={currentIndex} 
        totalSteps={totalStepsPerLap} 
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topRow}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          
          <View style={styles.progressWrapper}>
            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%']
              }) }]} />
            </View>
            <Text style={styles.progressText}>Lap {currentLap + 1} of {totalLaps}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.promptCard}>
          <Text style={styles.instruction}>Can you say...</Text>
          <Text style={[
            styles.targetWordText, 
            (targetItem?.text.length || 0) > 20 && { fontSize: 28 }
          ]}>
            {targetItem?.text || 'Loading...'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => {
                if (targetItem?.text) {
                  try { speak(targetItem.text, { type: 'prompt' }); } catch (e) {}
                }
              }}
            >
              <Ionicons name="volume-high" size={28} color="#1a73e8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }} /> 

        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={[
              styles.mainActionButton, 
              isRecording ? styles.recordingBtn : styles.idleBtn,
              isLoading && styles.loadingBtn
            ]} 
            onPress={handleToggleRecording} 
            disabled={isLoading || !targetItem}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="large" />
            ) : (
              <Ionicons 
                name={isRecording ? "checkmark-circle" : "mic"} 
                size={50} 
                color="white" 
              />
            )}
            <Text style={styles.mainBtnLabel}>
              {isLoading ? 'ANALYZING' : isRecording ? 'DONE' : 'SPEAK'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Lap Complete Modal */}
      <Modal visible={showLapModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🚩</Text>
            <Text style={styles.modalTitle}>Lap Complete!</Text>
            <Text style={styles.modalSub}>The turtle finished this path!</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={nextLap}>
              <Text style={styles.modalBtnText}>Next Adventure</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Session Complete Modal */}
      <Modal visible={isFinished} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🏆</Text>
            <Text style={styles.modalTitle}>Champion!</Text>
            <Text style={styles.modalSub}>You finished all 3 adventures!</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => { setIsFinished(false); router.back(); }}>
              <Text style={styles.modalBtnText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  topRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%', 
    paddingHorizontal: 16,
    paddingTop: 10
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrapper: { flex: 1, marginHorizontal: 20, alignItems: 'center' },
  progressBarContainer: { height: 12, width: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 10 },
  progressText: { color: 'white', marginTop: 4, fontWeight: 'bold', fontSize: 12 },
  promptCard: { 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    padding: 20, 
    borderRadius: 30, 
    width: '90%', 
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginTop: 10,
  },
  instruction: { color: '#666', fontSize: 16, fontWeight: '600' },
  targetWordText: { fontSize: 48, fontWeight: 'bold', color: '#1a73e8', textAlign: 'center', marginTop: 4 },
  turtleContainer: { position: 'absolute', top: '50%', marginTop: -75 },
  turtle: { width: 150, height: 150, resizeMode: 'contain' },
  feedbackContainer: { backgroundColor: 'rgba(255,255,255,0.98)', padding: 14, borderRadius: 20, width: '90%', alignSelf: 'center', marginTop: 12, marginBottom: 12 },
  feedbackText: { color: '#2E7D32', fontSize: 17, textAlign: 'center', fontWeight: '700' },
  bottomControls: { alignItems: 'center', width: '100%', marginBottom: 20 },
  mainActionButton: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  idleBtn: { backgroundColor: '#4CAF50' },
  recordingBtn: { backgroundColor: '#FF9800' },
  loadingBtn: { backgroundColor: '#1a73e8' },
  mainBtnLabel: { color: 'white', fontWeight: '900', fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 40, borderRadius: 30, alignItems: 'center' },
  modalEmoji: { fontSize: 60 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', marginVertical: 10 },
  modalSub: { fontSize: 18, color: '#666', marginBottom: 20 },
  modalBtn: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20 },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
