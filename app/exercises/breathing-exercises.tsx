import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';

interface Props {
  size: number;
  duration: number;
  label: string;
}

export default function BreathingBalloon({ size, duration, label }: Props) {
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p === 'inhale' ? 'exhale' : 'inhale'));
    }, duration);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ alignItems: 'center', marginTop: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 12 }}>{label}</Text>

      <View
        style={{
          width: phase === 'inhale' ? size : size * 0.7,
          height: phase === 'inhale' ? size : size * 0.7,
          borderRadius: size,
          backgroundColor: '#FF6B6B',
        }}
      />

      <Text style={{ marginTop: 12, fontSize: 16 }}>
        {phase === 'inhale' ? 'Breathe In' : 'Breathe Out'}
      </Text>
    </View>
  );
}