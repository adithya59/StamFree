import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface SpeechBubbleProps {
  message: string;
  type?: 'normal' | 'success' | 'error';
}

export function SpeechBubble({ message, type = 'normal' }: SpeechBubbleProps) {
  const bgColor = type === 'success' ? '#E8F5E9'
    : type === 'error' ? '#FFF3E0'
    : '#FFF';

  const textColor = type === 'success' ? '#2E7D32'
    : type === 'error' ? '#E65100'
    : '#333';

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      <View style={[styles.bubble, { backgroundColor: bgColor }]}>
        <Text style={[styles.text, { color: textColor }]}>{message}</Text>
      </View>
      {/* Triangle pointer */}
      <View style={[styles.pointer, { borderTopColor: bgColor }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    maxWidth: 260,
    alignSelf: 'center',
  },
  text: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
});
