import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { router } from 'expo-router';
import { H1, P } from '@/components/ui/Typography';

export default function DetectionIntro() {
  return (
    <ScreenWrapper>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, width: '100%' }}>
        <H1 style={{ textAlign: 'center', marginBottom: 16 }}>
          Let’s Check Your Speech 🎤
        </H1>

        <P style={{ textAlign: 'center', marginBottom: 32 }}>
          Tap below to analyze your speech pattern and get personalized exercises.
        </P>

        <TouchableOpacity
          className="bg-teal-500 px-8 py-4 rounded-full"
          onPress={() => router.push('/demo')}
        >
          <Text className="text-white font-bold text-lg text-center">
            Start Detection
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}