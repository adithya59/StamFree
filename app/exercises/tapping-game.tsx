/**
 * Syllable Tapping Game Screen
 * Children tap gradient bubbles corresponding to syllables while speaking.
 * First bubble tap starts recording, last bubble tap auto-stops.
 */

import { SyllableBubble } from '@/components/tapping/SyllableBubble';
import { SpeechBubble } from '@/components/tapping/SpeechBubble';
import { ConfettiParticles } from '@/components/tapping/ConfettiParticles';
import { useTappingSession } from '@/hooks/useTappingSession';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- WORD DATA ---
interface SyllableWord {
    id: string;
    word: string;
    syllables: string[];
    image?: any;
    tier?: number;
    ttsSyllables?: string[];
}

import { oneTapPool } from '@/services/seedOneTap';

const PRACTICE_WORDS: SyllableWord[] = oneTapPool
    .sort((a, b) => a.tier - b.tier)
    .map(item => ({
        id: item.id,
        word: item.text,
        syllables: item.syllables.map(s => s.toUpperCase()),
        tier: item.tier,
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
    const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    // Show success modal when result arrives with good accuracy
    useEffect(() => {
        if (lastResult && lastResult.accuracy > 0.7) {
            setShowSuccessModal(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [lastResult]);

    // Auto-start recording session once bubbles are loaded
    useEffect(() => {
        if (!loadingProgress && !isRecording && !isProcessing && !lastResult) {
            startSession();
        }
    }, [loadingProgress, currentWordIndex]);

    const currentWord = PRACTICE_WORDS[currentWordIndex];

    // Handle Syllable Tap — session is already running, just record taps
    // Last bubble tap = auto-stop
    const handleSyllableTap = (index: number) => {
        if (isProcessing || lastResult || !isRecording) return;

        recordTap();

        // If this is the last syllable, auto-stop
        if (taps.length + 1 >= currentWord.syllables.length) {
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                stopSession(currentWord.word, currentWord.syllables, currentWord.tier || 1);
            }, 300);
        }
    };

    const handleNextWord = async () => {
        reset();
        setShowSuccessModal(false);
        let nextIndex = 0;
        if (currentWordIndex < PRACTICE_WORDS.length - 1) {
            nextIndex = currentWordIndex + 1;
        } else {
            nextIndex = 0;
        }

        setCurrentWordIndex(nextIndex);

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
        const syllablesToSpeak = currentWord.ttsSyllables || currentWord.syllables;
        const textToSpeak = syllablesToSpeak.join('. ');
        Speech.speak(textToSpeak, {
            language: 'en-IN',
            rate: 0.8,
            pitch: 1.0,
        });
    };

    const handleRetry = () => {
        reset();
        setShowSuccessModal(false);
        // Restart session after a brief delay to let reset complete
        setTimeout(() => startSession(), 100);
    };

    return (
        <ImageBackground
            source={require('@/assets/images/underwater-background.jpg')}
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

                        {/* Word Card — at the top */}
                        <View style={styles.wordCard}>
                            <Text style={styles.fullWordText}>{currentWord.word}</Text>
                            <TouchableOpacity
                                onPress={handleSpeak}
                                style={styles.speakerButton}
                            >
                                <MaterialCommunityIcons name="volume-high" size={26} color="#009688" />
                            </TouchableOpacity>
                        </View>

                        {/* Main Content — Bubbles float freely */}
                        <View style={styles.mainContent}>


                                {/* Speech Bubble */}
                                <View style={styles.speechArea}>
                                    {lastResult ? (
                                        <SpeechBubble
                                            message={lastResult.accuracy > 0.7 ? "Perfect rhythm! 🌟" : "Almost! Try again!"}
                                            type={lastResult.accuracy > 0.7 ? 'success' : 'error'}
                                        />
                                    ) : isProcessing ? (
                                        <SpeechBubble message="Listening... 🎵" />
                                    ) : isRecording ? (
                                        <SpeechBubble message="Say each syllable as you tap! 🎤" />
                                    ) : (
                                        <SpeechBubble message="Tap each bubble and say it!" />
                                    )}

                                    {/* Confetti on success */}
                                    {(lastResult?.accuracy ?? 0) > 0.7 && <ConfettiParticles />}
                                </View>

                                {/* Syllable Bubbles */}
                                <View style={styles.bubbleArea}>
                                    <View style={styles.syllableContainer}>
                                        {currentWord.syllables.map((syllable, index) => (
                                            <SyllableBubble
                                                key={`${currentWordIndex}-${index}`}
                                                syllable={syllable}
                                                index={index}
                                                isRecording={isRecording}
                                                isTapped={isRecording && index < taps.length}
                                                result={lastResult ? lastResult.syllable_matches?.[index] ?? null : null}
                                                onTap={handleSyllableTap}
                                            />
                                        ))}
                                    </View>

                                    {/* Processing indicator */}
                                    {isProcessing && (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="large" color="#4CAF50" />
                                        </View>
                                    )}

                                    {/* Retry after failure */}
                                    {lastResult && lastResult.accuracy <= 0.7 && (
                                        <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                                            <Text style={styles.retryButtonText}>Try Again ↻</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Error Display */}
                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{error}</Text>
                                        <TouchableOpacity onPress={handleRetry}>
                                            <Text style={{ color: '#48DBFB', marginTop: 5 }}>Try Again</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                        </View>

                        {/* Success Modal Overlay */}
                        {showSuccessModal && (lastResult?.accuracy ?? 0) > 0.7 && (
                            <Animated.View
                                entering={FadeIn.duration(300)}
                                exiting={FadeOut.duration(200)}
                                style={styles.successOverlay}
                            >
                                <Animated.View entering={FadeIn.duration(400)} style={styles.successCard}>
                                    <LottieView
                                        source={require('@/assets/lottie/fish.json')}
                                        autoPlay
                                        loop={true}
                                        style={{ width: 180, height: 180 }}
                                    />
                                    <Text style={styles.successTitle}>Great Job! 🌟</Text>
                                    <Text style={styles.successFeedback}>{lastResult?.feedback}</Text>
                                    <TouchableOpacity style={styles.nextButton} onPress={handleNextWord}>
                                        <Text style={styles.nextButtonText}>Next Word ➜</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </Animated.View>
                        )}
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

    // Main content — fills remaining screen
    mainContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
    },


    // Speech bubble area
    speechArea: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        minHeight: 80,
    },

    // Bubble area
    bubbleArea: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    syllableContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 20,
        minHeight: 110,
    },

    // Word card at the top
    wordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    fullWordText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#2E5077',
        letterSpacing: 1,
    },
    speakerButton: {
        marginLeft: 15,
        padding: 10,
        backgroundColor: '#E0F2F1',
        borderRadius: 30,
        elevation: 2,
    },

    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 28,
        marginTop: 20,
        backgroundColor: '#FF9800',
        borderRadius: 30,
        elevation: 4,
    },
    retryButtonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },

    loadingContainer: { alignItems: 'center', marginTop: 16 },

    errorContainer: { padding: 20, alignItems: 'center' },
    errorText: { color: 'red', textAlign: 'center' },

    // Success Modal
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    successCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        width: '85%',
        elevation: 10,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginTop: 8,
    },
    successFeedback: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginVertical: 12,
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
});