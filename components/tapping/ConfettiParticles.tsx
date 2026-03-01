import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

const PARTICLES = ['⭐', '🎵', '✨', '🎶', '💫', '🌟', '🎉', '✨'];

export function ConfettiParticles() {
  return (
    <>
      {PARTICLES.map((emoji, i) => {
        const angle = (i / PARTICLES.length) * 2 * Math.PI;
        const x = Math.cos(angle) * 80;
        const y = Math.sin(angle) * 80 - 40;

        return (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(i * 50).springify()}
            exiting={FadeOut.delay(600)}
            style={[styles.particle, { left: 50 + x, top: 50 + y }]}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Animated.View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute' },
  emoji: { fontSize: 24 },
});
