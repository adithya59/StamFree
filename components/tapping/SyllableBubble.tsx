import React, { useState } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  ZoomOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const BUBBLE_PALETTES: [string, string][] = [
  ['rgba(255,107,107,0.65)', 'rgba(238,90,36,0.65)'],   // Coral
  ['rgba(72,219,251,0.65)', 'rgba(10,189,227,0.65)'],    // Sky Blue
  ['rgba(254,202,87,0.65)', 'rgba(255,159,67,0.65)'],    // Sunshine
  ['rgba(255,159,243,0.65)', 'rgba(243,104,224,0.65)'],   // Pink
  ['rgba(85,230,193,0.65)', 'rgba(38,208,161,0.65)'],     // Mint
];

const TAPPED_COLORS: [string, string] = ['rgba(76,175,80,0.75)', 'rgba(46,125,50,0.75)'];

// Small particle that flies outward from the bubble
function BurstParticle({ angle, color, delay }: { angle: number; color: string; delay: number }) {
  const distance = 50 + Math.random() * 30;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;
  const size = 6 + Math.random() * 6;

  const entering = () => {
    'worklet';
    const initialValues = {
      opacity: 1,
      transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
    };
    const animations = {
      opacity: withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) })),
      transform: [
        { translateX: withDelay(delay, withTiming(tx, { duration: 400, easing: Easing.out(Easing.cubic) })) },
        { translateY: withDelay(delay, withTiming(ty, { duration: 400, easing: Easing.out(Easing.cubic) })) },
        { scale: withDelay(delay, withTiming(0.2, { duration: 400, easing: Easing.out(Easing.quad) })) },
      ],
    };
    return { initialValues, animations };
  };

  return (
    <Animated.View
      entering={entering}
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

interface SyllableBubbleProps {
  syllable: string;
  index: number;
  isRecording: boolean;
  isTapped: boolean;
  result?: boolean | null;
  onTap: (index: number) => void;
}

export function SyllableBubble({ syllable, index, isRecording, isTapped, result, onTap }: SyllableBubbleProps) {
  const scale = useSharedValue(1);
  const burstOpacity = useSharedValue(1);
  const [showBurst, setShowBurst] = useState(false);
  const colors = BUBBLE_PALETTES[index % BUBBLE_PALETTES.length];

  const handlePress = () => {
    // Burst pop: quick scale up then settle smaller
    scale.value = withTiming(1.25, { duration: 120, easing: Easing.out(Easing.quad) }, () => {
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    });
    burstOpacity.value = withTiming(0.4, { duration: 120 }, () => {
      burstOpacity.value = withTiming(1, { duration: 200 });
    });

    // Show burst particles
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 500);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onTap(index);
  };

  const tapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: burstOpacity.value,
  }));

  const borderColor = result === true ? '#4CAF50'
    : result === false ? '#EF5350'
    : isTapped ? 'rgba(255,255,255,0.6)'
    : 'transparent';

  const baseOpacity = isRecording ? 1 : (result !== null && result !== undefined) ? 1 : 0.8;

  // Gentle float-up from bottom
  const enteringAnimation = () => {
    'worklet';
    const duration = 900;
    const initialValues = {
      opacity: 0,
      transform: [{ translateY: 400 }, { scale: 0.6 }],
    };
    const animations = {
      opacity: withDelay(index * 250, withTiming(1, { duration: duration / 2, easing: Easing.out(Easing.quad) })),
      transform: [
        { translateY: withDelay(index * 250, withTiming(0, { duration, easing: Easing.out(Easing.cubic) })) },
        { scale: withDelay(index * 250, withTiming(1, { duration, easing: Easing.out(Easing.cubic) })) },
      ],
    };
    return { initialValues, animations };
  };

  // Generate 8 particles evenly spaced around the circle
  const particleAngles = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8);
  const particleColor = isTapped ? '#4CAF50' : colors[0].replace('0.65', '1');

  return (
    <View style={styles.bubbleWrapper}>
      {/* Burst particles */}
      {showBurst && particleAngles.map((angle, i) => (
        <BurstParticle
          key={`burst-${i}`}
          angle={angle}
          color={particleColor}
          delay={i * 20}
        />
      ))}

      <Animated.View
        entering={enteringAnimation}
        exiting={ZoomOut.duration(300)}
      >
        <Animated.View style={tapStyle}>
          <Pressable onPress={handlePress}>
            <LinearGradient
              colors={isTapped ? TAPPED_COLORS : colors}
              style={[
                styles.bubble,
                { borderColor, borderWidth: result !== null && result !== undefined ? 3 : 0 }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[styles.text, { opacity: baseOpacity }]}>{syllable}</Text>
              {result === true && <Text style={styles.resultIcon}>✓</Text>}
              {result === false && <Text style={styles.resultIcon}>✗</Text>}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    zIndex: 10,
  },
  bubble: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  text: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  resultIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
});
