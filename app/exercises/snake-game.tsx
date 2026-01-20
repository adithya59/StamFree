/**
 * Snake Game Screen
 * 
 * Full game screen integrating SnakeGameEngine and SnakePath.
 * Implements core gameplay loop with progress indicator, controls, and post-game flow.
 */

import { ConfettiAnimation } from '@/components/snake/ConfettiAnimation';
import { PauseOverlay } from '@/components/snake/PauseOverlay';
import { RetryModal } from '@/components/snake/RetryModal';
import { SnakeGameEngine } from '@/components/snake/SnakeGameEngine';
import { SnakePath } from '@/components/snake/SnakePath';
import { SuccessModal } from '@/components/snake/SuccessModal';
import { SnakeProgressModal } from '@/components/snake/SnakeProgressModal';
// Design System
import { Button } from '@/components/ui/Button';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, H2, P } from '@/components/ui/Typography';
import { SNAKE_CONFIG } from '@/constants/snakeConfig';
import type { GameMetrics } from '@/hooks/useSnakeGame';
import { useSnakeSession } from '@/hooks/useSnakeSession';
import { getPhonemeVoicePrompt } from '@/services/phonemeVoice';
import { getInstructionText } from '@/services/snakeProgression';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useNavigation } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, Easing, ImageBackground, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '@/config/firebaseConfig';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';

const backgroundImage = require('@/assets/images/jungle-background.png');

const useHaptics = () => {
  const light = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
  }, []);

  const medium = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, []);

  const success = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, []);

  const warning = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, []);

  return { light, medium, success, warning };
};

export default function SnakeGameScreen() {
  const navigation = useNavigation();
  const { light: hapticLight, medium: hapticMedium, success: hapticSuccess, warning: hapticWarning } = useHaptics();
  const readyToastOpacity = React.useRef(new Animated.Value(0)).current;

  const handleSessionError = React.useCallback((error: Error) => {
    console.error('[SnakeGame] Session error:', error);
    Alert.alert('Error', 'Failed to load level. Returning to menu.');
    router.back();
  }, []);

  // Use Brain logic hook for level management
  const { 
    sessionConfig,
    isLoading: loading,
    isAnalyzing,
    loadSession,
    completeSession,
  } = useSnakeSession({
    onError: handleSessionError,
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [finalMetrics, setFinalMetrics] = useState<GameMetrics | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [optimisticStars, setOptimisticStars] = useState<number>(3);
  const [finalStars, setFinalStars] = useState<number | undefined>(undefined);
  const [displayFeedback, setDisplayFeedback] = useState<string>("Great job! We're analyzing your sound...");
  const [earnedXp, setEarnedXp] = useState<number | undefined>(undefined);
  const [completionReason, setCompletionReason] = useState<'win' | 'timeout' | 'manual' | 'silent'>('win');
  const engineResetRef = React.useRef<(() => void) | null>(null);
  const pathSeedRef = React.useRef<number>(0);
  const [pathSeed, setPathSeed] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePhonemeCount, setActivePhonemeCount] = useState<number>(0);
  const [masteredPhonemeCount, setMasteredPhonemeCount] = useState<number>(0);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [activePhonemes, setActivePhonemes] = useState<any[]>([]);
  const [masteredPhonemes, setMasteredPhonemes] = useState<any[]>([]);
  const [lockedPhonemes, setLockedPhonemes] = useState<any[]>([]);
  const [phonemeStats, setPhonemeStats] = useState<Record<string, { attempts: number; successCount: number }>>({});
  const [phonemePool, setPhonemePool] = useState<Record<string, any>>({});

  // Determine voicing requirement based on category/tier
  const isVoicedTarget = sessionConfig ? (sessionConfig.tier === 1 || sessionConfig.tier === 2) : false;
  
  // Subscribe to user playlist for progress stats
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Fetch phoneme pool first
    const fetchPool = async () => {
      try {
        const snap = await getDocs(collection(db, 'snake_phoneme_pool'));
        const pool: Record<string, any> = {};
        snap.forEach((d) => {
          pool[d.id] = { id: d.id, ...d.data() };
        });
        setPhonemePool(pool);
      } catch (e) {
        console.error('[SnakeGame] Error fetching phoneme pool:', e);
      }
    };
    
    fetchPool();
    
    const playlistRef = doc(db, `users/${user.uid}/snake_progress/playlist`);
    const unsubscribe = onSnapshot(playlistRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActivePhonemeCount(data.activePhonemes?.length || 0);
        setMasteredPhonemeCount(data.masteredPhonemes?.length || 0);
        setPhonemeStats(data.phonemeStats || {});
        
        // Convert phoneme IDs to full phoneme objects
        const activeIds = data.activePhonemes || [];
        const masteredIds = data.masteredPhonemes || [];
        const allIds = Object.keys(phonemePool);
        const lockedIds = allIds.filter(id => !activeIds.includes(id) && !masteredIds.includes(id));
        
        setActivePhonemes(activeIds.map((id: string) => phonemePool[id]).filter((p: any) => p));
        setMasteredPhonemes(masteredIds.map((id: string) => phonemePool[id]).filter((p: any) => p));
        setLockedPhonemes(lockedIds.map((id: string) => phonemePool[id]).filter((p: any) => p));
      }
    }, (err) => {
      console.error('[SnakeGame] Error listening to playlist:', err);
    });
    
    return () => unsubscribe();
  }, [phonemePool]);
  
  const speechProb = analysisResult?.aiResult?.confidence as number | undefined;
  const voicedDetected = analysisResult?.aiResult?.metrics?.voiced_detected as boolean | undefined;

  // TTS for instructions
  useEffect(() => {
    if (!loading && sessionConfig && !gameStarted && !gameCompleted && !showSuccessModal) {
      const speakInstructions = async () => {
        setIsSpeaking(true);
        const instruction = getInstructionText(sessionConfig.phoneme, sessionConfig.tier, sessionConfig.category);
        const voicePrompt = getPhonemeVoicePrompt(sessionConfig.example);
        const fullText = `Take a Deep breath in.... ${instruction}`;
        
        Speech.speak(fullText, {
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
        });
      };
      
      speakInstructions();
    }

    return () => {
      Speech.stop();
    };
  }, [sessionConfig, loading, gameStarted, gameCompleted, showSuccessModal]);

  // Header back button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleBack = useCallback(() => {
    hapticLight();
    Speech.stop();
    if (gameStarted && !gameCompleted) {
      Alert.alert(
        'Pause Practice?',
        "You're doing great! If you leave now, this session's progress won't be saved.",
        [
          { text: 'Keep Playing', style: 'cancel' },
          { text: 'End Session', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [gameStarted, gameCompleted, hapticLight]);

  const handleWin = useCallback((metrics: GameMetrics) => {
    console.log('[SnakeGame] Win!', metrics);
    hapticSuccess();
    setGameCompleted(true);
    setFinalMetrics(metrics);
    setCompletionReason('win');
    setShowRetryModal(false);
    setShowConfetti(true);
    setOptimisticStars(0);
    setFinalStars(undefined);
    setDisplayFeedback('🎉 You did it! Let me listen to your amazing voice...');
    setShowSuccessModal(false);
  }, [hapticSuccess]);

  // Analyze after win if audio available
  useEffect(() => {
    if (completionReason !== 'win' || !finalMetrics || !audioUri) return;

    const runAnalysis = async () => {
      try {
        const result = await completeSession(finalMetrics, audioUri);
        setOptimisticStars(result.optimisticStars);

        // Wait for AI analysis in background
        const analysisData = await result.analysisPromise;
          if (analysisData) {
            // AI Result logic
            const stars = analysisData.aiResult?.stars ?? result.optimisticStars;
            setFinalStars(stars);
            
            // Set earned XP from backend (tier-based deduction logic)
            const xp = analysisData.aiResult?.xp ?? (stars === 3 ? 10 : (stars === 2 ? 7 : 4)); 
            setEarnedXp(xp);

            let feedback = analysisData.aiResult?.feedback ?? 'Great effort!';
            if (analysisData.leveledUp) {
              feedback = `Mastered! New sound unlocked: ${analysisData.nextPhoneme || 'Next one!'}`;
            }
            
            setDisplayFeedback(feedback);
            setAnalysisResult(analysisData);
          }
      } catch (error) {
        console.error('[SnakeGame] Analysis error:', error);
        const fallback = {
          stars: 1,
          feedback: 'Great effort! Let\'s analyze this one next time.',
        };
        setFinalStars(fallback.stars);
        setDisplayFeedback(fallback.feedback);
      }
    };

    runAnalysis();
  }, [completionReason, finalMetrics, audioUri, completeSession]);

  const handleTimeout = useCallback((metrics: GameMetrics) => {
    console.log('[SnakeGame] Timeout!', metrics);
    hapticWarning();
    setGameCompleted(true);
    setFinalMetrics(metrics);
    setCompletionReason('timeout');
    setShowRetryModal(true);
  }, [hapticWarning]);

  const handleRecordingStop = useCallback((uri: string | null) => {
    console.log('[SnakeGame] Recording stopped:', uri);
    setAudioUri(uri);
  }, []);

  const triggerReadyToast = useCallback(() => {
    readyToastOpacity.stopAnimation?.();
    readyToastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(readyToastOpacity, { toValue: 1, duration: 160, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.delay(900),
      Animated.timing(readyToastOpacity, { toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
    ]).start();
  }, [readyToastOpacity]);

  const handleAudioError = useCallback((error: Error) => {
    console.error('[SnakeGame] Audio error:', error);
    if (error.message.includes('permission')) {
      Alert.alert(
        'Microphone Needed',
        'Snake needs to hear you! Please enable microphone in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    } else {
      Alert.alert('Audio Error', error.message);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setGameStarted(false);
    setGameCompleted(false);
    setFinalMetrics(null);
    setAudioUri(null);
    setShowSuccessModal(false);
    setShowRetryModal(false);
    setShowConfetti(false);
    setAnalysisResult(null);
    setShowPauseOverlay(false);
    setCompletionReason('win');
    pathSeedRef.current += 1;
    setPathSeed(pathSeedRef.current);
    engineResetRef.current?.();
  }, []);

  const handlePause = useCallback(() => {
    hapticLight();
    setShowPauseOverlay(true);
  }, [hapticLight]);

  const handleResumePause = useCallback(() => {
    hapticLight();
    setShowPauseOverlay(false);
  }, [hapticLight]);

  const handlePauseQuit = useCallback(() => {
    hapticMedium();
    setShowPauseOverlay(false);
    setGameStarted(false);
    setGameCompleted(true);
    router.back();
  }, [hapticMedium]);

  const handleContinue = useCallback(() => {
    setShowSuccessModal(false);

    if (!sessionConfig) {
      router.back();
      return;
    }

    pathSeedRef.current += 1;
    setPathSeed(pathSeedRef.current);
    setGameStarted(false);
    setGameCompleted(false);
    setFinalMetrics(null);
    setAudioUri(null);
    setShowSuccessModal(false);
    setShowRetryModal(false);
    setShowConfetti(false);
    setAnalysisResult(null);
    loadSession(); 
  }, [sessionConfig, loadSession]);

  const handleCloseSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    router.back();
  }, []);

  useEffect(() => {
    if (!showSuccessModal) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseSuccessModal();
      return true;
    });
    return () => backHandler.remove();
  }, [showSuccessModal, handleCloseSuccessModal]);

  const introAnim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  const headerEntranceStyle = useMemo(() => ({
    opacity: introAnim,
    transform: [
      {
        translateY: introAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
      },
    ],
  }), [introAnim]);

  const cardEntranceStyle = useMemo(() => ({
    opacity: introAnim,
    transform: [
      {
        translateY: introAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
      },
    ],
  }), [introAnim]);

  return (
    <ScreenWrapper bgClass="bg-therapeutic-calm dark:bg-slate-950">
      {loading && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1a73e8" />
        </View>
      )}

      {!loading && sessionConfig && (
        <>
          {completionReason !== 'win' && (
            <RetryModal
              visible={showRetryModal}
              reason={completionReason as 'timeout' | 'manual' | 'silent'}
              onRetry={handleRetry}
              onBack={() => {
                setShowRetryModal(false);
                router.back();
              }}
            />
          )}

          {finalMetrics && (
            <PauseOverlay
              visible={showPauseOverlay}
              elapsedTime={finalMetrics.durationAchieved}
              targetDuration={finalMetrics.targetDuration}
              completionPercentage={finalMetrics.completionPercentage}
              onResume={handleResumePause}
              onQuit={handlePauseQuit}
              onAutoReset={() => {
                console.log('[SnakeGame] Pause timeout - auto reset');
                handleRetry();
                setShowPauseOverlay(false);
              }}
            />
          )}

          {finalMetrics && (
            <SuccessModal
              visible={showSuccessModal}
              gameMetrics={finalMetrics}
              stars={optimisticStars}
              onClose={handleCloseSuccessModal}
              finalStars={finalStars}
              isLoading={isAnalyzing}
              feedback={displayFeedback}
              xpReward={earnedXp ?? 10} 
              totalXp={analysisResult?.totalXp || 0} 
              phonemeMatch={analysisResult?.aiResult?.metrics?.phoneme_match as boolean | undefined}
              speechProb={analysisResult?.aiResult?.confidence ?? speechProb}
              voicedDetected={voicedDetected}
              speechThreshold={SNAKE_CONFIG.SPEECH_PROB_MIN}
              isVoicedTarget={isVoicedTarget}
              onContinue={handleContinue}
              onRetry={handleRetry}
            />
          )}

          {showConfetti && (
            <ConfettiAnimation
              duration={3000}
              onComplete={() => {
                setShowConfetti(false);
                setShowSuccessModal(true);
              }}
            />
          )}

          <SnakeGameEngine
            pathLength={100}
            levelConfig={{
              targetDurationSec: sessionConfig.targetDuration,
              allowPauses: false,
              maxPauseDuration: 0.5,
            }}
            voicingRequired={isVoicedTarget}
            onWin={handleWin}
            onTimeout={handleTimeout}
            onRecordingStop={handleRecordingStop}
            onAudioError={handleAudioError}
            enablePerfTracking={__DEV__}
          >
            {({
              gameState,
              isRunning,
              isPaused,
              start,
              pause,
              resume,
              reset,
              hasPermission,
            }) => (
              <View className="flex-1 flex-col">
                <Animated.View 
                  style={[headerEntranceStyle]} 
                  className="h-14 flex-row justify-between items-center px-3 pt-1 bg-transparent z-30"
                  pointerEvents="box-none"
                >
                  <TouchableOpacity
                    className="w-12 h-12 rounded-full bg-white/95 dark:bg-slate-800/95 items-center justify-center border border-[#1a73e8]/30 dark:border-teal-500/30 shadow-sm active:opacity-80"
                    onPress={showSuccessModal ? handleCloseSuccessModal : handleBack}
                    accessibilityLabel="Back"
                  >
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#1a73e8" />
                  </TouchableOpacity>

                  {/* Level & Progress Pill (Top Center) */}
                  <View className="flex-row items-center gap-2">
                    <View className="bg-white/95 dark:bg-slate-800/95 rounded-2xl px-4 py-2 border border-[#1a73e8]/30 dark:border-teal-500/30 items-center shadow-sm">
                      <Text className="text-sm font-bold text-[#1a73e8] dark:text-teal-400">
                        Sound: {sessionConfig.phoneme}
                      </Text>
                      <Text className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                        Tier {sessionConfig.tier}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Stats (Top Right) - Now Clickable */}
                  <TouchableOpacity 
                    className="bg-white/95 dark:bg-slate-800/95 rounded-2xl px-3 py-2 border border-[#1a73e8]/30 dark:border-teal-500/30 shadow-sm active:opacity-80"
                    onPress={() => setShowProgressModal(true)}
                  >
                    <View className="flex-row items-center gap-2">
                      <MaterialCommunityIcons name="bullseye-arrow" size={16} color="#F59E0B" />
                      <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">{activePhonemeCount}</Text>
                    </View>
                    <View className="flex-row items-center gap-2 mt-1">
                      <MaterialCommunityIcons name="trophy" size={16} color="#059669" />
                      <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{masteredPhonemeCount}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[cardEntranceStyle]} className="flex-1 m-3 mt-2 bg-[#F7FAFF] dark:bg-slate-900 rounded-2xl overflow-hidden border border-[#1a73e8]/10 dark:border-teal-500/20 shadow-xl">
                  {(() => {
                    engineResetRef.current = reset;
                    return null;
                  })()}

                  <ImageBackground
                    source={backgroundImage}
                    className="flex-1 w-full h-full"
                    resizeMode="cover"
                  >
                    <SnakePath
                      position={gameState.position / 100}
                      isMoving={isRunning && !isPaused && !gameState.isHalted}
                      showSleepOverlay={gameState.showSleepOverlay}
                      pathLength={100}
                      showBackground={true}
                      triggerAppleEat={gameState.isWon}
                      variationKey={pathSeed}
                    />
                  </ImageBackground>

                  {/* Pause Button Overlay - Visible during gameplay */}
                  {gameStarted && isRunning && !gameCompleted && (
                    <View className="absolute bottom-6 right-6 z-20" pointerEvents="box-none">
                      <TouchableOpacity
                        className="w-14 h-14 rounded-full bg-[#1a73e8]/95 dark:bg-teal-600/95 items-center justify-center shadow-xl active:opacity-80"
                        onPress={async () => {
                          hapticLight();
                          if (isPaused) {
                            resume();
                            handleResumePause();
                          } else {
                            pause();
                            handlePause();
                          }
                        }}
                        disabled={!isRunning || gameCompleted}
                        accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
                      >
                        <MaterialCommunityIcons
                          name={isPaused ? 'play' : 'pause'}
                          size={28}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {isPaused && isRunning && (
                    <View className="absolute inset-0 bg-slate-900/10 dark:bg-black/30 justify-center items-center" pointerEvents="none">
                      <Text className="text-base font-bold text-slate-800 dark:text-slate-200">Paused</Text>
                    </View>
                  )}

                  {!gameStarted && !gameCompleted && (
                    <View className="absolute inset-0 justify-center items-center bg-black/50">
                      <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 items-center max-w-[80%] shadow-xl">
                        <Text className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-3">Say:</Text>
                        <Text className="text-5xl font-bold text-[#1a73e8] dark:text-teal-400 mb-4">{sessionConfig.phoneme}</Text>
                        <Text className="text-base text-slate-600 dark:text-slate-300 text-center mb-5">
                          {getInstructionText(sessionConfig.phoneme, sessionConfig.tier, sessionConfig.category)}
                        </Text>
                        <View className="w-full items-center gap-2">
                          <Button
                            title={isSpeaking ? "Listen..." : "Start"}
                            onPress={async () => {
                              hapticLight();
                              Speech.stop();
                              triggerReadyToast();
                              setGameStarted(true);
                              await start();
                            }}
                            disabled={!hasPermission || isSpeaking}
                            icon={
                              <MaterialCommunityIcons 
                                name={isSpeaking ? "volume-high" : "play"} 
                                size={24} 
                                color="#FFFFFF" 
                              />
                            }
                            className="w-40 self-center"
                          />
                          {!hasPermission && (
                            <Text className="text-center text-rose-600 dark:text-rose-400 text-sm mt-2">
                              Microphone permission required
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )}

                  {gameState.showSleepOverlay && isRunning && (
                    <View className="absolute top-[26%] left-0 right-0 items-center">
                      <View className="bg-white dark:bg-slate-800 rounded-xl py-2.5 px-3 items-center max-w-[55%] shadow-md">
                        <Text className="text-2xl mb-1">😴</Text>
                        <Text className="text-sm text-slate-600 dark:text-slate-300 text-center">
                          Wake up the snake! Keep saying {sessionConfig.phoneme}...
                        </Text>
                      </View>
                    </View>
                  )}

                  {gameCompleted && finalMetrics && completionReason !== 'win' && (
                    <View className="absolute inset-0 justify-center items-center bg-black/60">
                      <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 items-center max-w-[85%] shadow-xl">
                        <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-5 text-center">
                          {finalMetrics.completionPercentage >= 100 ? '🎉 Well Done!' : '⏱️ Time\'s Up!'}
                        </Text>
                        <Text className="text-base text-slate-600 dark:text-slate-300 mb-2">
                          Duration: {finalMetrics.durationAchieved.toFixed(1)}s / {finalMetrics.targetDuration}s
                        </Text>
                        <Text className="text-base text-slate-600 dark:text-slate-300 mb-2">
                          Progress: {Math.round(finalMetrics.completionPercentage)}%
                        </Text>
                        {finalMetrics.pauseCount > 0 && (
                          <Text className="text-base text-slate-600 dark:text-slate-300 mb-2">
                            Pauses: {finalMetrics.pauseCount} ({finalMetrics.totalPauseDuration.toFixed(1)}s)
                          </Text>
                        )}
                        
                        <View className="flex-row gap-3 mt-5">
                          <Button
                            title="Try Again"
                            variant="outline"
                            onPress={() => {
                              hapticLight();
                              handleRetry();
                            }}
                            className="flex-1"
                          />
                          <Button
                            title="Done"
                            onPress={() => {
                              hapticLight();
                              router.back();
                            }}
                            className="flex-1"
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </Animated.View>

                <Animated.View style={[cardEntranceStyle]} className="bg-[#F9FBFF] dark:bg-slate-900 rounded-2xl m-3 mb-4 pb-4 border border-[#1a73e8]/10 dark:border-teal-500/20 shadow-xl relative">
                  <View className="mx-4 mt-3 mb-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
                    <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Say:</Text>
                    <Text className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">{sessionConfig.example}</Text>
                  </View>
                </Animated.View>
              </View>
            )}
          </SnakeGameEngine>
        </>
      )}
      
      {/* Progress Modal */}
      <SnakeProgressModal
        visible={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        activePhonemes={activePhonemes}
        masteredPhonemes={masteredPhonemes}
        lockedPhonemes={lockedPhonemes}
        phonemeStats={phonemeStats}
      />
    </ScreenWrapper>
  );
}
