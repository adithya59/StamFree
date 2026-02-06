import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Animated } from 'react-native';

interface WoodpeckerProps {
    state: 'idle' | 'peck' | 'success' | 'confused';
}

export function Woodpecker({ state }: WoodpeckerProps) {
    const scale = useRef(new Animated.Value(1)).current;
    const rotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (state === 'peck') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rotate, { toValue: 1, duration: 100, useNativeDriver: true }),
                    Animated.timing(rotate, { toValue: 0, duration: 100, useNativeDriver: true }),
                ])
            ).start();
        } else {
            rotate.setValue(0); // Stop animation
        }

        if (state === 'success') {
            Animated.sequence([
                Animated.spring(scale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
            ]).start();
        }

    }, [state]);

    const rotateInterpolate = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '15deg']
    });

    // Use a generic existing image if specific one is missing, or a text fallback
    // Assuming 'rabbit.png' exists from list_dir, let's use that as a placeholder for now if we can't get a woodpecker
    // or just use a View with Text "Woodpecker" to be safe.

    return (
        <View style={styles.container}>
            <Animated.View style={[
                styles.characterContainer,
                {
                    transform: [
                        { scale: scale },
                        { rotate: rotateInterpolate }
                    ]
                }
            ]}>
                {/* Fallback visual since actual assets might be missing */}
                <View style={styles.placeholderCircle}>
                    <Text style={styles.emoji}>
                        {state === 'peck' ? '🐦' :
                            state === 'success' ? '⭐' :
                                state === 'confused' ? '❓' : '🐦'}
                    </Text>
                </View>
                <Text style={styles.label}>Pecky</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 150,
    },
    characterContainer: {
        alignItems: 'center',
    },
    placeholderCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#2E5077',
        elevation: 5
    },
    emoji: {
        fontSize: 50,
    },
    label: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 4,
    }
});
