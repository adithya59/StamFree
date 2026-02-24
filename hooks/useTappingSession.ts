/**
 * Hook for Tapping Game Session
 * Manages recording, tap capturing, and server communication
 */

import { analyzeTappingAudio, type TappingAnalysisResponse } from '@/services/tappingBackend';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';

export interface TappingSessionState {
    isRecording: boolean;
    isProcessing: boolean;
    taps: number[]; // Current session taps
    lastResult: TappingAnalysisResponse | null;
    error: string | null;
}

export function useTappingSession() {
    const [state, setState] = useState<TappingSessionState>({
        isRecording: false,
        isProcessing: false,
        taps: [],
        lastResult: null,
        error: null,
    });

    const recordingRef = useRef<Audio.Recording | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const tapsRef = useRef<number[]>([]); // Ref to avoid stale closures

    // Request permissions on mount
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Audio.requestPermissionsAsync();
                if (status !== 'granted') {
                    setState(prev => ({ ...prev, error: 'Permission to access microphone was denied' }));
                }
            } catch (e) {
                console.error('Permission error:', e);
            }
        })();
    }, []);

    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync();
            }
        };
    }, []);

    const startSession = useCallback(async () => {
        try {
            // Reset state
            tapsRef.current = [];
            setState(prev => ({
                ...prev,
                isRecording: true,
                taps: [],
                lastResult: null,
                error: null,
            }));

            // Start recording
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            recordingRef.current = recording;
            startTimeRef.current = Date.now();
            console.log('🎙️ Tapping Session Started');

        } catch (error) {
            console.error('Failed to start recording:', error);
            setState(prev => ({ ...prev, isRecording: false, error: 'Failed to start recording' }));
        }
    }, []);

    const recordTap = useCallback(() => {
        if (!state.isRecording || !startTimeRef.current) return;

        const now = Date.now();
        const timestamp = (now - startTimeRef.current) / 1000; // Seconds

        // Update ref immediately
        tapsRef.current.push(timestamp);

        // Update state for UI
        setState(prev => ({
            ...prev,
            taps: [...prev.taps, timestamp]
        }));

        console.log(`👆 Tap at ${timestamp.toFixed(2)}s`);
    }, [state.isRecording]);

    const stopSession = useCallback(async (targetWord: string, syllables: string[], tier: number) => {
        if (!recordingRef.current) return;

        try {
            setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();

            if (!uri) {
                throw new Error('No recording URI found');
            }

            // Use ref to ensure we have all taps
            const finalTaps = tapsRef.current;
            console.log('Analyzing tapping session...', { tapsCount: finalTaps.length, targetWord });

            // Analyze
            const result = await analyzeTappingAudio({
                audioUri: uri,
                taps: finalTaps,
                targetWord,
                syllables
            });

            console.log('✅ Analysis Result:', result);

            setState(prev => ({
                ...prev,
                isProcessing: false,
                lastResult: result
            }));

            // Save to Firestore
            if (auth.currentUser) {
                try {
                    await addDoc(collection(db, `users/${auth.currentUser.uid}/practice_sessions`), {
                        gameId: 'onetap',
                        timestamp: serverTimestamp(),
                        word: targetWord,
                        tier: tier,
                        accuracy: result.accuracy,
                        isSync: result.is_sync,
                        fluent: result.fluent,
                        syllables: syllables.length,
                        syllable_matches: result.syllable_matches
                    });
                    console.log('💾 Session saved to Firestore');
                } catch (saveError) {
                    console.error('Failed to save session:', saveError);
                    // Don't fail the UI, just log the error
                }
            }

        } catch (error) {
            console.error('Failed to stop/analyze session:', error);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: 'Failed to process session. Check server connection.'
            }));
        } finally {
            recordingRef.current = null;
            startTimeRef.current = null;
        }
    }, []);

    return {
        ...state,
        startSession,
        stopSession,
        recordTap,
        reset: () => {
            tapsRef.current = [];
            setState(prev => ({ ...prev, taps: [], lastResult: null, error: null }));
        }
    };
}
