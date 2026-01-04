/**
 * Balloon Asset Component (Pufferfish)
 * Animated visual with scale tied to inflation level
 * Shake/fade on pop, translateY on fly away
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

export interface BalloonAssetProps {
  /** Inflation level from 0 to 1 */
  inflationLevel: number;
  /** Whether balloon has popped */
  hasPopped: boolean;
  /** Whether balloon is flying away (success state) */
  isFlying: boolean;
}

export const BalloonAsset: React.FC<BalloonAssetProps> = ({
  inflationLevel,
  hasPopped,
  isFlying,
}) => {
  const scaleValue = useSharedValue(1);
  const rotationValue = useSharedValue(0);
  const opacityValue = useSharedValue(1);
  const translateYValue = useSharedValue(0);

  // Update scale based on inflation
  useEffect(() => {
    const targetScale = 1 + inflationLevel * 0.8; // 1.0 to 1.8
    scaleValue.value = withSpring(targetScale, {
      damping: 3,
      mass: 1,
      overshootClamping: false,
    });
  }, [inflationLevel]);

  // Pop animation
  useEffect(() => {
    if (hasPopped) {
      // Shake effect
      rotationValue.value = withSequence(
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(5, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );

      // Fade out
      opacityValue.value = withTiming(0, { duration: 300 });
    }
  }, [hasPopped]);

  // Flying away animation
  useEffect(() => {
    if (isFlying && !hasPopped) {
      // Float upward
      translateYValue.value = withTiming(-300, {
        duration: 1000,
      });
      
      // Fade out
      opacityValue.value = withTiming(0, { duration: 1000 });
    }
  }, [isFlying]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleValue.value },
      { rotateZ: `${rotationValue.value}deg` },
      { translateY: translateYValue.value },
    ],
    opacity: opacityValue.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pufferfishContainer, animatedStyle]}>
        {hasPopped ? (
          <Text style={styles.pufferfishSpiky}>🐡</Text>
        ) : (
          <Text style={styles.pufferfishNormal}>🐡</Text>
        )}
      </Animated.View>

      {/* TODO: Replace emoji with actual SVG assets from Icons8 */}
      {/* Normal: pufferfishNormal.svg */}
      {/* Popped: pufferfishSpiky.svg or alternative */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
  pufferfishContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pufferfishNormal: {
    fontSize: 120,
  },
  pufferfishSpiky: {
    fontSize: 120,
    filter: 'saturate(1.5)',
  },
});
