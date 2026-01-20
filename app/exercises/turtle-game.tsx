import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated, // For progress bar (React Native LayoutAnimation/Animated)
  Modal,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { startRecording, stopRecording } from '../../services/audioService';
import { analyzeTurtleAudio } from '@/services/turtleAnalysis';
import { calculateSpeakingRate } from '@/services/turtleLogic';
import { TurtleVideo } from '../../components/turtle/TurtleVideo';
import { getNextTurtleSession, recordTurtleResult, type TurtleContent } from '@/services/turtlePlaylist';
import { auth } from '@/config/firebaseConfig';
import { Button } from '@/components/ui/Button';
import { JourneyCompleteModal } from '@/components/turtle/JourneyCompleteModal';
import { TurtleProgressModal } from '@/components/turtle/TurtleProgressModal';

export default function TalkingTurtle() {
  const [sessionContent, setSessionContent] = useState<TurtleContent[][]>([]);
  const [currentLap, setCurrentLap] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState('🐢 Press to start!');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [totalXP, setTotalXP] = useState(0); // Total accumulated XP from Firebase
  const [showLapModal, setShowLapModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // NEW: TTS state
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Progress modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [tier1Unlocked, setTier1Unlocked] = useState(true);
  const [tier2Unlocked, setTier2Unlocked] = useState(false);
  const [tier3Unlocked, setTier3Unlocked] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [lockedCount, setLockedCount] = useState(0);
  const [masteredSentences, setMasteredSentences] = useState<string[]>([]);
  const [activeSentences, setActiveSentences] = useState<string[]>([]);
  const [lockedSentences, setLockedSentences] = useState<string[]>([]);
  
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
        
        // Load user's total XP from Firebase
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/config/firebaseConfig');
        const playlistRef = doc(db, `users/${auth.currentUser.uid}/turtle_progress/playlist`);
        const playlistSnap = await getDoc(playlistRef);
        
        if (playlistSnap.exists()) {
          const playlistData = playlistSnap.data();
          setTotalXP(playlistData.xp || 0);
          setTier2Unlocked(playlistData.tier2Unlocked || false);
          setTier3Unlocked(playlistData.tier3Unlocked || false);
          setMasteredCount(playlistData.masteredItems?.length || 0);
          setActiveCount(playlistData.activeItems?.length || 0);
          setLockedCount(playlistData.lockedItems?.length || 0);
          
          // Load actual sentence text
          const loadSentences = async (ids: string[]) => {
            const sentences: string[] = [];
            for (const id of ids) {
              const itemRef = doc(db, 'turtle_content_pool', id);
              const itemSnap = await getDoc(itemRef);
              if (itemSnap.exists()) {
                sentences.push(itemSnap.data().text);
              }
            }
            return sentences;
          };
          
          setMasteredSentences(await loadSentences(playlistData.masteredItems || []));
          setActiveSentences(await loadSentences(playlistData.activeItems || []));
          setLockedSentences(await loadSentences(playlistData.lockedItems || []));
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
    
    // Auto-play model audio when item changes
    if (targetItem) {
        // Small delay to let transition finish
        setTimeout(() => playModelAudio(), 800);
    }
  }, [currentGlobalStep, totalSteps, targetItem]); // Added targetItem dependency

  // Initial Loading State
  if (sessionContent.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-green-400">
        <ActivityIndicator size="large" color="white" />
        <Text className="mt-5 text-white text-lg font-bold">Preparing your adventure...</Text>
      </View>
    );
  }

  const playModelAudio = async () => {
    if (!targetItem || isRecording) return;
    
    try {
      setIsSpeaking(true);
      
      // Check if text has pause markers (|)
      const text = targetItem.chunkedText || targetItem.text;
      
      if (text.includes('|')) {
        // Split by pipe and speak each segment with pauses
        const segments = text.split('|').map(s => s.trim()).filter(s => s.length > 0);
        console.log(`[TTS] Speaking ${segments.length} segments with pauses:`, segments);
        
        for (let i = 0; i < segments.length; i++) {
          console.log(`[TTS] Speaking segment ${i + 1}/${segments.length}: "${segments[i]}"`);
          
          // Add word-by-word spacing to prevent contractions
          const wordByWord = segments[i].split(' ').join(', ');
          
          await new Promise<void>((resolve) => {
            Speech.speak(wordByWord, {
              rate: 0.4, // Slower for paused content
              pitch: 1.0,
              onDone: () => resolve(),
              onStopped: () => resolve(),
              onError: () => resolve()
            });
          });
          
          // Add 1200ms pause between segments (except after the last one)
          if (i < segments.length - 1) {
            console.log(`[TTS] Pausing 1200ms before next segment...`);
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
        }
        console.log(`[TTS] Finished all segments`);
        setIsSpeaking(false);
      } else {
        // No pause markers, speak normally but with word-by-word spacing
        console.log(`[TTS] Speaking single phrase (no pauses): "${text}"`);
        
        // Add commas between words for word-by-word pronunciation
        const wordByWord = text.split(' ').join(', ');
        
        Speech.speak(wordByWord, {
          rate: 0.5, // Slow pace
          pitch: 1.0,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
      }
    } catch (e) {
      console.log('TTS Error', e);
      setIsSpeaking(false);
    }
  };

  const handleStartRecording = async () => {
    if (isLoading || isRecording) return;
    
    // Stop TTS if speaking
    if (isSpeaking) {
        Speech.stop();
        setIsSpeaking(false);
    }
    
    try {
      setFeedback('🐢 I am listening...');
      await startRecording();
      setIsRecording(true);
    } catch (error) {
      setFeedback("Couldn't start the mic! 🐢");
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    const audioData = await stopRecording();
    if (!audioData) {
        return;
    }

    // CLIENT-SIDE WPM CALCULATION (Quick Pre-Check)
    const clientResult = calculateSpeakingRate(
      targetItem?.wordCount || 0,
      audioData.duration
    );
    
    // Only proceed to server if WPM is in valid range
    if (clientResult.status !== 'perfect') {
      // Show feedback visually and speak it
      setFeedback(clientResult.feedback);
      Speech.speak(
        clientResult.feedback
          .replace(/[\uD800-\uDFFF]/g, '') 
          .replace(/[\u2600-\u27BF]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      );
      console.log(`[Turtle] WPM check failed: ${clientResult.wpm} WPM (${clientResult.status})`);
      return;
    }
    
    // WPM is in range - proceed to server for final validation
    
    // SERVER-SIDE VALIDATION (Content & Fluency)
    try {
      setIsLoading(true);
      setFeedback('Checking your words...');
      const result = await analyzeTurtleAudio(
        audioData.uri, 
        targetItem?.text,
        targetItem?.tier,
        targetItem?.requiredPauses
      );

      if (result) {
        const isCorrect = result.game_pass && result.clinical_pass;
        setFeedback(result.feedback);
        Speech.speak(
          result.feedback
            .replace(/[\uD800-\uDFFF]/g, '')
            .replace(/[\u2600-\u27BF]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        );

        if (auth.currentUser && targetItem) {
           const { leveledUp, xpAwarded } = await recordTurtleResult(
             auth.currentUser.uid, 
             targetItem.id, 
             isCorrect
           );
           
           // Update total XP
           if (xpAwarded > 0) {
             setTotalXP(prev => prev + xpAwarded);
             console.log(`+${xpAwarded} XP! Total: ${totalXP + xpAwarded}`);
           }
        }

        if (isCorrect) {
            processSuccess();
        }
      } else {
        setFeedback("I couldn't hear you clearly. Try again.");
      }
    } catch (error) {
      setFeedback("Something went wrong. Try again.");
    } finally {
        setIsLoading(false);
    }
  };

  // 1. Called when analysis is successful
  const processSuccess = () => {
    // Just move the index forward to trigger the video segment
    // The actual "next step" logic will happen after the video finishes
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
  };

  // 2. Called by TurtleVideo when the segment finishes playing
  const handleVideoSegmentComplete = () => {
    console.log(`[TurtleGame] Segment complete. Current: ${currentIndex}, Total: ${currentDeck.length}`);
    
    // If we just finished the last segment (index matches length because we incremented BEFORE video)
    if (currentIndex >= currentDeck.length) {
      console.log('[TurtleGame] Journey complete! Showing modal.');
      setShowLapModal(true);
    } else {
      console.log('[TurtleGame] Ready for next phrase.');
      // Auto-play audio for next phrase if needed, or just wait for user
      // For now, we just wait for user to press speaker button
    }
  };

  // Helper to highlight pause markers in Tier 2/3 sentences
  const highlightPauseMarkers = (chunkedText?: string) => {
    if (!chunkedText || !chunkedText.includes('|')) {
      // Tier 1 or no pause markers - show plain text
      return (
        <Text className={`text-gray-100 font-bold text-center mt-1 ${
          (targetItem?.text.length || 0) > 20 ? 'text-3xl' : 'text-5xl'
        }`}>
          {targetItem?.text || 'Loading...'}
        </Text>
      );
    }
    
    // Tier 2/3 with pause markers
    const parts = chunkedText.split('|').map(p => p.trim());
    return (
      <Text className="text-gray-100 font-bold text-center mt-1 text-3xl">
        {parts.map((part, idx) => (
          <React.Fragment key={idx}>
            <Text>{part}</Text>
            {idx < parts.length - 1 && (
              <Text className="text-amber-400 font-black text-4xl"> • </Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    );
  };

  const nextLap = () => {
    setShowLapModal(false);
    const nextLapIndex = currentLap + 1;
    
    if (nextLapIndex < totalLaps) {
      // Move to next journey
      setCurrentLap(nextLapIndex);
      setCurrentIndex(0);
      setFeedback(`🐢 Journey ${nextLapIndex + 1} begins!`);
    } else {
      // All journeys complete
      setIsFinished(true);
    }
  };

  return (
    <View className="flex-1 bg-teal-50 dark:bg-slate-900">
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e293b', '#334155'] : ['#f0fdf4', '#dcfce7', '#bbf7d0']} 
        className="absolute inset-0"
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header Section (Kept separate at top) */}
        <View className="flex-row items-center justify-between w-full px-5 pt-3 mb-2 z-20">
            <TouchableOpacity 
              className="w-11 h-11 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white dark:border-slate-600 justify-center items-center shadow-sm"
              onPress={() => {
                try {
                  router.back();
                } catch (e) {
                  console.warn('Navigation error:', e);
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#166534" />
            </TouchableOpacity>
            
            <View className="flex-1 mx-4">
              <View className="h-3 w-full bg-emerald-200 dark:bg-slate-700/50 rounded-full overflow-hidden border-2 border-emerald-300 dark:border-slate-600">
                <Animated.View 
                  className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full shadow-sm"
                  style={{ 
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    }) 
                  }} 
                />
              </View>
              <View className="flex-row justify-between mt-1 px-1">
                <Text className="text-emerald-900 dark:text-emerald-200 font-bold text-[10px] tracking-widest uppercase">Start</Text>
                <Text className="text-emerald-900 dark:text-emerald-200 font-bold text-[10px] tracking-widest uppercase">Finish</Text>
              </View>
            </View>
            
            {/* Stats Button */}
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-white/60 dark:bg-slate-800/60 border border-white dark:border-slate-600 justify-center items-center shadow-sm"
              onPress={() => setShowProgressModal(true)}
            >
              <Ionicons name="stats-chart" size={20} color={isDark ? "#4ade80" : "#166534"} />
            </TouchableOpacity>
        </View>

        {/* Maximized Content Card */}
        <View className="flex-1 w-full px-3 pb-4">
            <View className="flex-1 bg-black rounded-[40px] overflow-hidden shadow-2xl border-[6px] border-white relative">
                
                {/* 1. Video Layer (Fills the Card) */}
                <View className="absolute inset-0">
                    <TurtleVideo 
                        currentStep={currentIndex} 
                        totalSteps={totalStepsPerLap}
                        videoDuration={13000}
                        journeyIndex={currentLap}
                        onSegmentComplete={handleVideoSegmentComplete}
                        style={{ width: '100%', height: '100%' }}
                    />
                    {/* Gradient Overlays for Readability */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent']} 
                        className="absolute top-0 w-full h-32"
                    />
                    <LinearGradient
                        colors={['transparent', 'transparent', 'rgba(0,0,0,0.6)']} 
                        className="absolute bottom-0 w-full h-48"
                    />
                </View>

                {/* Target Phrase Card (Translucent Overlay) */}
                <View className="absolute top-6 w-full px-6 z-10">
                    <View className="bg-white/20 p-5 rounded-[24px] items-center shadow-lg border border-white/30 backdrop-blur-md relative overflow-hidden">
                        
                        {/* XP Badge (Left) */}
                        <TouchableOpacity 
                            className="absolute top-3 left-3 bg-amber-400/90 px-3 py-1.5 rounded-2xl border-2 border-white active:bg-amber-500"
                            onPress={() => setShowProgressModal(true)}
                        >
                            <Text className="text-amber-900 font-extrabold text-xs tracking-wider">{totalXP} XP</Text>
                        </TouchableOpacity>
                        
                        {/* Speaker Button (Right) */}
                        <TouchableOpacity 
                            className="absolute top-3 right-3 bg-white/20 p-2 rounded-full border border-white/20 active:bg-white/30"
                            onPress={playModelAudio}
                            disabled={isSpeaking || isRecording}
                        >
                            <Ionicons name={isSpeaking ? "volume-high" : "volume-medium"} size={18} color="white" />
                        </TouchableOpacity>

                        <Text className="text-white text-xs font-bold uppercase tracking-widest mb-2 shadow-sm opacity-90">Say this...</Text>
                        {highlightPauseMarkers(targetItem?.chunkedText)}
                    </View>
                </View>

                {/* 3. Controls Overlay (Bottom of Card) */}
                <View className="absolute bottom-8 w-full items-center z-10 px-6">
                     {/* Feedback Pill */}
                    {feedback !== '🐢 Press to start!' && (
                        <Reanimated.View 
                            entering={FadeInDown.springify()} 
                            className="bg-black/60 px-5 py-2 rounded-full mb-6 shadow-xl backdrop-blur-md border border-white/20"
                        >
                            <Text className="text-white text-sm font-bold text-center">{feedback}</Text>
                        </Reanimated.View>
                    )}

                    {/* Mic Button */}
                    <View className={`p-1.5 rounded-full border-4 ${isRecording ? 'border-amber-400/50' : isLoading ? 'border-blue-400/50' : 'border-emerald-400/40'} bg-black/20 backdrop-blur-sm`}>
                        <TouchableOpacity 
                            className={`w-20 h-20 rounded-full justify-center items-center shadow-2xl ${
                                isLoading ? 'bg-blue-500' : isRecording ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            onPressIn={handleStartRecording}
                            onPressOut={handleStopRecording} 
                            disabled={isLoading || !targetItem}
                            activeOpacity={0.9}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" size="large" />
                            ) : (
                                <Ionicons 
                                    name={isRecording ? "mic" : "mic"} 
                                    size={36} 
                                    color="white" 
                                />
                            )}
                            <Text className="text-white font-extrabold text-[8px] mt-1 tracking-widest opacity-90 uppercase">
                                {isLoading ? '...' : isRecording ? 'RELEASE' : 'HOLD'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </View>
        </View>
      </SafeAreaView>

      {/* Modals */}
      <JourneyCompleteModal 
        visible={showLapModal}
        journeyNumber={currentLap + 1}
        onContinue={nextLap}
      />
      <Modal visible={isFinished} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center">
          <View className="bg-white p-10 rounded-3xl items-center shadow-2xl w-[85%]">
            <View className="bg-yellow-100 p-6 rounded-full mb-6">
                <Text className="text-6xl shadow-sm">🏆</Text>
            </View>
            <Text className="text-3xl font-black mb-2 text-slate-800 text-center">Journey Complete!</Text>
            <Text className="text-lg text-slate-500 mb-8 text-center leading-6">You've mastered all 3 adventures! The Turtle is proud.</Text>
            <Button title="Finish" onPress={() => { setIsFinished(false); router.back(); }} variant="primary" className="w-full rounded-2xl" />
          </View>
        </View>
      </Modal>
      
      {/* Progress Modal */}
      <TurtleProgressModal
        visible={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        totalXP={totalXP}
        tier1Unlocked={tier1Unlocked}
        tier2Unlocked={tier2Unlocked}
        tier3Unlocked={tier3Unlocked}
        masteredCount={masteredCount}
        activeCount={activeCount}
        lockedCount={lockedCount}
        masteredSentences={masteredSentences}
        activeSentences={activeSentences}
        lockedSentences={lockedSentences}
      />
    </View>
  );
}
