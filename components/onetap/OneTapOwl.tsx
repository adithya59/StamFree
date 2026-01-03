/**
 * OneTapOwl Component
 * Controls the owl Lottie animation using frame slicing for different game states
 * - sleeping: Eyes closed (Frame 25)
 * - ready: Standing straight, looping (Frames 0-20)
 * - success: Head tilt + blink reaction (Frames 20-60)
 * - flying: Flies up and fades out using Reanimated
 */

import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

type OwlState = 'sleeping' | 'ready' | 'success' | 'flying';

// Frame markers based on owl.json animation
const FRAME_SLEEP = 25; // Eyes closed
const FRAMES_READY = { start: 0, end: 20 }; // Standing straight
const FRAMES_REACTION = { start: 20, end: 60 }; // Head tilt + blink

export interface OneTapOwlProps {
  gameState: OwlState;
}

export const OneTapOwl: React.FC<OneTapOwlProps> = ({ gameState }) => {
  const lottieRef = useRef<LottieView>(null);

  // Flying animation using Reanimated
  const animatedStyle = useAnimatedStyle(() => {
    const isFlying = gameState === 'flying';

    return {
      transform: [
        // Move UP by 500 pixels (negative Y goes up)
        {
          translateY: withTiming(isFlying ? -500 : 0, {
            duration: 800,
            easing: Easing.in(Easing.back(1.5)), // Pulls back slightly before shooting up
          }),
        },
        // Shrink to 0.5 size to look like it's going far away
        { scale: withTiming(isFlying ? 0.5 : 1, { duration: 800 }) },
      ],
      // Fade out at the very end
      opacity: withTiming(isFlying ? 0 : 1, { duration: 800 }),
    };
  });

  // Control Lottie frames based on game state
  useEffect(() => {
    if (!lottieRef.current) return;

    switch (gameState) {
      case 'sleeping':
        // Freeze on closed eyes frame
        lottieRef.current.play(FRAME_SLEEP, FRAME_SLEEP);
        break;

      case 'ready':
        // Loop standing straight animation
        lottieRef.current.play(FRAMES_READY.start, FRAMES_READY.end);
        break;

      case 'success':
        // Play head tilt reaction (one-shot)
        lottieRef.current.play(FRAMES_REACTION.start, FRAMES_REACTION.end);
        break;

      case 'flying':
        // Freeze animation while the whole body flies up
        lottieRef.current.pause();
        break;
    }
  }, [gameState]);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LottieView
        ref={lottieRef}
        source={require('@/assets/lottie/owl.json')}
        autoPlay={false}
        loop={gameState === 'ready'} // Only loop when waiting
        style={styles.owl}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  owl: {
    width: 250,
    height: 250,
  },
});
