/**
 * Cooldown Overlay Component
 * Shows countdown timer and breathing animation during cooldown
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

export interface CooldownOverlayProps {
  /** Remaining cooldown time in seconds (0 = no cooldown) */
  cooldownRemaining: number;
  /** Whether to show the overlay */
  visible: boolean;
}

export const CooldownOverlay: React.FC<CooldownOverlayProps> = ({
  cooldownRemaining,
  visible,
}) => {
  const breathe = useSharedValue(1);

  // Breathing animation (scale 1 → 1.05 → 1)
  useEffect(() => {
    if (visible && cooldownRemaining > 0) {
      breathe.value = withRepeat(
        withTiming(1.05, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1, // Infinite
        true // Reverse
      );
    } else {
      breathe.value = 1;
    }
  }, [visible, cooldownRemaining]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  if (!visible || cooldownRemaining <= 0) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.breathingContainer, animatedStyle]}>
        <Text style={styles.breatheText}>Breathe...</Text>
        <Text style={styles.waitText}>Wait for it...</Text>
        <Text style={styles.countdown}>{cooldownRemaining}s</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  breathingContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  breatheText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E5077',
    marginBottom: 8,
  },
  waitText: {
    fontSize: 18,
    color: '#4A7BA7',
    marginBottom: 16,
  },
  countdown: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
});
