/**
 * Syllable Tapping Game Screen
 * Children tap buttons corresponding to syllables while speaking.
 */

import { Woodpecker } from '@/components/tapping/Woodpecker';
import { useTappingSession } from '@/hooks/useTappingSession';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- WORD DATA (Hardcoded for prototype) ---
interface SyllableWord {
    id: string;
    word: string;
    syllables: string[];
    image?: any; // Placeholder for future images
    tier?: number;
    ttsSyllables?: string[]; // Optional override for TTS
}

import { oneTapPool } from '@/services/seedOneTap';

// Map the oneTapPool to the format expected by the game
// Sort by Tier (1 -> 2 -> 3)
const PRACTICE_WORDS: SyllableWord[] = oneTapPool
    .sort((a, b) => a.tier - b.tier)
    .map(item => ({
        id: item.id,
        word: item.text,
        syllables: item.syllables.map(s => s.toUpperCase()), // Ensure uppercase for display/consistency
        tier: item.tier, // Optional: Pass tier if needed for UI later
        ttsSyllables: item.ttsSyllables
    }));

export default function TappingGameScreen() {
    const {
        isRecording,
        isProcessing,
        lastResult,
        error,
        taps,
        startSession,
        stopSession,
        recordTap,
        reset
    } = useTappingSession();

    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(true);
    const [woodpeckerState, setWoodpeckerState] = useState<'idle' | 'peck' | 'success' | 'confused'>('idle');

    // Fetch saved progress on mount
    useEffect(() => {
        const fetchProgress = async () => {
            if (!auth.currentUser) {
                setLoadingProgress(false);
                return;
            }
            try {
                const docRef = doc(db, `users/${auth.currentUser.uid}/games/onetap`);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.currentIndex !== undefined && data.currentIndex < PRACTICE_WORDS.length) {
                        setCurrentWordIndex(data.currentIndex);
                    }
                }
            } catch (e) {
                console.error('Error fetching one-tap progress:', e);
            } finally {
                setLoadingProgress(false);
            }
        };
        fetchProgress();
    }, []);

    // UI Animations
    const syllableScales = useRef<Animated.Value[]>([]).current;

    // Initialize animations based on current word
    const currentWord = PRACTICE_WORDS[currentWordIndex];

    useEffect(() => {
        // Reset scales when word changes
        while (syllableScales.length) syllableScales.pop();
        currentWord.syllables.forEach(() => {
            syllableScales.push(new Animated.Value(1));
        });
    }, [currentWordIndex, currentWord]);

    // Update woodpecker state
    useEffect(() => {
        if (isProcessing) {
            setWoodpeckerState('peck');
        } else if (lastResult) {
            setWoodpeckerState(lastResult.pecky_state);
        } else if (isRecording) {
            setWoodpeckerState(taps.length > 0 ? 'peck' : 'idle');
        } else {
            setWoodpeckerState('idle');
        }
    }, [isProcessing, lastResult, isRecording, taps.length]);

    // Handle Syllable Tap
    const handleSyllableTap = (index: number) => {
        if (!isRecording) return;

        // 1. Record Logic
        recordTap();

        // 2. Haptic Feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // 3. Visual Feedback (Button Pulse)
        if (syllableScales[index]) {
            Animated.sequence([
                Animated.timing(syllableScales[index], { toValue: 0.9, duration: 50, useNativeDriver: true }),
                Animated.timing(syllableScales[index], { toValue: 1.0, duration: 50, useNativeDriver: true }),
            ]).start();
        }
    };

    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        reset();
        startSession();
    };

    const handleStop = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        stopSession(currentWord.word, currentWord.syllables, currentWord.tier || 1);
    };

    const handleNextWord = async () => {
        reset();
        let nextIndex = 0;
        if (currentWordIndex < PRACTICE_WORDS.length - 1) {
            nextIndex = currentWordIndex + 1;
        } else {
            nextIndex = 0; // Loop back
        }

        setCurrentWordIndex(nextIndex);
        setWoodpeckerState('idle');

        // Save progress
        if (auth.currentUser) {
            try {
                const docRef = doc(db, `users/${auth.currentUser.uid}/games/onetap`);
                await setDoc(docRef, { currentIndex: nextIndex }, { merge: true });
            } catch (e) {
                console.error('Error saving progress:', e);
            }
        }
    };

    const handleSpeak = () => {
        // "Pine. Apple." (Syllables only as requested)
        // Use ttsSyllables if available (e.g., "Tie, Gur") otherwise default syllables
        const syllablesToSpeak = currentWord.ttsSyllables || currentWord.syllables;
        const textToSpeak = syllablesToSpeak.join('. ');

        Speech.speak(textToSpeak, {
            language: 'en-IN',
            rate: 0.8, // Slightly faster for natural flow
            pitch: 1.0,
        });
    };

    return (
        <ImageBackground
            source={require('@/assets/images/jungle-background.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.safeArea}>
                {loadingProgress ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={{ marginTop: 10, color: '#2E5077' }}>Loading Level...</Text>
                    </View>
                ) : (
                    <>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <MaterialCommunityIcons name="arrow-left" size={24} color="#2E5077" />
                            </TouchableOpacity>
                            <View style={styles.headerBadge}>
                                <Text style={styles.title}>Rhythm Adventure</Text>
                            </View>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Main Content */}
                        <ScrollView contentContainerStyle={styles.scrollContent}>

                            {/* Character Scene */}
                            <View style={styles.sceneContainer}>
                                <Woodpecker state={woodpeckerState} />
                            </View>

                            {/* Word Display Area */}
                            <View style={styles.wordCard}>
                                {!isRecording && !lastResult && !isProcessing && (
                                    <Text style={styles.promptText}>Tap START and say:</Text>
                                )}

                                <View style={styles.syllableContainer}>
                                    {currentWord.syllables.map((syllable, index) => (
                                        <View key={index} style={styles.syllableWrapper}>
                                            <TouchableOpacity
                                                onPress={() => handleSyllableTap(index)}
                                                activeOpacity={isRecording ? 0.7 : 1}
                                                disabled={!isRecording}
                                            >
                                                <Animated.View
                                                    style={[
                                                        styles.syllableButton,
                                                        // Dynamic Styling
                                                        isRecording
                                                            ? styles.syllableActive
                                                            : lastResult
                                                                ? (lastResult.syllable_matches?.[index] ? styles.syllableCorrect : styles.syllableIncorrect)
                                                                : styles.syllableInactive,

                                                        // Highlight tapped syllables if recording
                                                        isRecording && index < taps.length && styles.syllableTapped,
                                                        { transform: [{ scale: syllableScales[index] || 1 }] }
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.syllableText,
                                                        isRecording
                                                            ? styles.textActive
                                                            : lastResult
                                                                ? (lastResult.syllable_matches?.[index] ? styles.textCorrect : styles.textIncorrect)
                                                                : styles.textInactive
                                                    ]}>
                                                        {syllable}
                                                    </Text>
                                                </Animated.View>
                                            </TouchableOpacity>
                                            <Text style={styles.tapIndicator}>
                                                {isRecording && index < taps.length ? '✓' : ''}
                                                {lastResult && (lastResult.syllable_matches?.[index] ? '✅' : '❌')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Full Word Label */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                                    <Text style={styles.fullWordText}>{currentWord.word}</Text>
                                    <TouchableOpacity
                                        onPress={handleSpeak}
                                        style={styles.speakerButton}
                                    >
                                        <MaterialCommunityIcons name="volume-high" size={26} color="#009688" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Feedback Area */}
                            {lastResult && (
                                <View style={styles.resultCard}>
                                    <Text style={styles.resultTitle}>
                                        {lastResult.accuracy > 0.7 ? '🎉 Great Job!' : '👍 Good Try!'}
                                    </Text>
                                    <Text style={styles.feedbackText}>{lastResult.feedback}</Text>

                                    <View style={styles.statsRow}>
                                        <View style={styles.stat}>
                                            <Text style={styles.statLabel}>Sync</Text>
                                            <MaterialCommunityIcons
                                                name={lastResult.is_sync ? "check-circle" : "alert-circle"}
                                                size={24}
                                                color={lastResult.is_sync ? "#4CAF50" : "#FF9800"}
                                            />
                                        </View>
                                        <View style={styles.stat}>
                                            <Text style={styles.statLabel}>Fluency</Text>
                                            <MaterialCommunityIcons
                                                name={lastResult.fluent ? "check-circle" : "check"}
                                                size={24}
                                                color={lastResult.fluent ? "#4CAF50" : "#999"}
                                            />
                                        </View>
                                    </View>

                                    <TouchableOpacity style={styles.nextButton} onPress={handleNextWord}>
                                        <Text style={styles.nextButtonText}>Next Word ➜</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Error Display */}
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                    <TouchableOpacity onPress={handleStart}>
                                        <Text style={{ color: 'blue', marginTop: 5 }}>Try Again</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                        </ScrollView>

                        {/* Bottom Controls */}
                        <View style={styles.controls}>
                            {isProcessing ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#4CAF50" />
                                    <Text style={styles.statusText}>Pecky is listening...</Text>
                                </View>
                            ) : isRecording ? (
                                <TouchableOpacity onPress={handleStop} style={styles.stopButton}>
                                    <Text style={styles.stopButtonText}>I'm Done ✅</Text>
                                </TouchableOpacity>
                            ) : !lastResult ? (
                                <TouchableOpacity onPress={handleStart} style={styles.startButton}>
                                    <Text style={styles.startButtonText}>START</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={reset} style={styles.retryButton}>
                                    <Text style={styles.retryButtonText}>Try Again ↻</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        elevation: 2,
    },
    headerBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E5077',
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 100,
    },
    sceneContainer: {
        height: 200,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    wordCard: {
        width: width * 0.9,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 5,
        marginBottom: 20,
    },
    promptText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    syllableContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    syllableWrapper: {
        alignItems: 'center',
    },
    syllableButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 6,
        elevation: 6,
    },
    syllableActive: {
        backgroundColor: '#FF9800',
        borderColor: '#E65100',
        borderBottomColor: '#E65100',
    },
    syllableInactive: {
        backgroundColor: '#CFD8DC',
        borderColor: '#B0BEC5',
        borderBottomColor: '#90A4AE',
    },
    syllableTapped: {
        backgroundColor: '#4CAF50', // Green when tapped
        borderBottomColor: '#2E7D32',
    },
    syllableText: {
        fontSize: 20,
        fontWeight: '900',
    },
    textActive: { color: '#FFF' },
    textInactive: { color: '#546E7A' },
    textCorrect: { color: '#1B5E20' },
    textIncorrect: { color: '#B71C1C' },

    syllableCorrect: {
        backgroundColor: '#C8E6C9', // Light Green
        borderColor: '#4CAF50',
        borderBottomColor: '#2E7D32',
    },
    syllableIncorrect: {
        backgroundColor: '#FFCDD2', // Light Red
        borderColor: '#EF5350',
        borderBottomColor: '#C62828',
    },
    tapIndicator: {
        height: 20,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginTop: 4,
    },
    fullWordText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2E5077',
        letterSpacing: 1,
    },
    speakerButton: {
        marginLeft: 15,
        padding: 10,
        backgroundColor: '#E0F2F1',
        borderRadius: 30,
        elevation: 2
    },

    // Result Card
    resultCard: {
        width: width * 0.9,
        backgroundColor: '#E8F5E9',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4CAF50',
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 8,
    },
    feedbackText: {
        fontSize: 16,
        textAlign: 'center',
        color: '#333',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    stat: {
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    nextButton: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 4,
    },
    nextButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Bottom Controls
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    startButton: {
        backgroundColor: '#4CAF50',
        width: 200,
        paddingVertical: 16,
        borderRadius: 35,
        alignItems: 'center',
        elevation: 8,
        borderBottomWidth: 6,
        borderBottomColor: '#2E7D32',
    },
    startButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold', letterSpacing: 1 },

    stopButton: {
        backgroundColor: '#F44336',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
    },
    stopButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    retryButton: {
        padding: 12,
    },
    retryButtonText: { color: '#555', fontSize: 16, fontWeight: '600' },

    loadingContainer: { alignItems: 'center' },
    statusText: { marginTop: 8, color: '#4CAF50', fontWeight: '600' },

    errorContainer: { padding: 20, alignItems: 'center' },
    errorText: { color: 'red', textAlign: 'center' },
});
