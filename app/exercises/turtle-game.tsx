import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  startRecording,
  stopRecording,
  uploadTurtleAudio,
} from '../../services/audioService';

export default function TurtleWoodsAdventure() {
  const sentences = [
    'The quick fox jumps!',
    'I love the green woods.',
    'The turtle walks fast today!',
    'Look at the tall trees.',
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState(
    '🚀 Say the sentence fast and smooth!'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const videoSource = require('../../assets/images/turtle1.mp4');
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.pause();
  });

  // Cleanup effect to stop recording if the component unmounts
  useEffect(() => {
    return () => {
      if (recording) {
        stopRecording(recording).catch((err) =>
          console.error('Failed to stop recording on unmount', err)
        );
      }
    };
  }, [recording]);

  const handleStartRecording = async () => {
    if (recording) {
      setFeedback('🔴 Already recording! Press the checkmark when done.');
      return;
    }
    try {
      setFeedback('🎤 Recording... Speak now!');
      const newRecording = await startRecording();
      setRecording(newRecording);
    } catch (error) {
      setFeedback('🐢 Mic error! Please try again.');
      Alert.alert(
        'Microphone Error',
        'Could not start recording. Please make sure you have granted microphone permissions.'
      );
    }
  };

  const handleStopRecording = async () => {
    if (isLoading || !recording) {
      if (!recording) {
        setFeedback('Press the mic to start recording first!');
      }
      return;
    }

    setIsLoading(true);
    setFeedback('🐢 Checking your speech...');

    try {
      const audioUri = await stopRecording(recording);
      setRecording(null); // Clear the recording object

      if (!audioUri) {
        throw new Error('Failed to get audio file.');
      }

      const result = await uploadTurtleAudio(audioUri);
      setIsLoading(false);

      if (result && result.is_hit) {
        handleSuccess();
      } else {
        let newFeedback = '🐢 Almost! Keep it smooth and fast!';
        if (result?.wpm < 110) {
          newFeedback = '🐢 A bit slow! Try speaking faster next time!';
        }
        setFeedback(newFeedback);
        Speech.speak(newFeedback);
      }
    } catch (error) {
      setIsLoading(false);
      setRecording(null); // Also clear on error
      setFeedback('🐢 Error analyzing speech. Try again!');
      Alert.alert(
        'Analysis Error',
        'There was a problem analyzing your speech.'
      );
    }
  };

  const handleSuccess = () => {
    setFeedback('🏆 AMAZING! Watch the turtle go!');
    Speech.speak('Perfect speed!');

    player.play();

    setTimeout(() => {
      player.pause();

      if (currentIndex + 1 < sentences.length) {
        setCurrentIndex(currentIndex + 1);
        setFeedback('🚀 Next sentence! Ready?');
      } else {
        setIsFinished(true);
      }
    }, 3000); // Plays for 3 seconds
  };

  return (
    <View style={styles.container}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        allowsFullscreen={false}
        nativeControls={false}
        contentMode="cover"
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.instruction}>Say this quickly:</Text>
          <Text style={styles.sentenceText}>{sentences[currentIndex]}</Text>

          <View style={styles.feedbackBox}>
            {isLoading ? (
              <ActivityIndicator color="#2E7D32" />
            ) : (
              <Text style={styles.feedbackText}>{feedback}</Text>
            )}
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.btn, styles.speakBtn, recording && styles.recordingBtn]}
            onPress={handleStartRecording}
            disabled={isLoading}
          >
            <Ionicons name="mic" size={40} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.doneBtn]}
            onPress={handleStopRecording}
            disabled={isLoading}
          >
            <Ionicons name="checkmark" size={40} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={isFinished} transparent animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Woods Explored! 🌲</Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setCurrentIndex(0);
              setIsFinished(false);
              setFeedback('🚀 Say the sentence fast and smooth!');
            }}
          >
            <Text style={styles.resetText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderRadius: 20,
  },
  instruction: { color: '#ddd', fontSize: 18 },
  sentenceText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  feedbackBox: {
    marginTop: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly' },
  btn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  speakBtn: { backgroundColor: '#4CAF50' },
  recordingBtn: { backgroundColor: '#E53935' }, // Red when recording
  doneBtn: { backgroundColor: '#FF9800' },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  resetBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 15 },
  resetText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
});