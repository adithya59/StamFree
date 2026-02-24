import { View, Text, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { router } from 'expo-router';
import { H1, P } from '@/components/ui/Typography';

export default function DetectionIntro() {
  return (
    <ScreenWrapper className="justify-center items-center px-6">
      <H1 className="text-center mb-4">
        Let’s Check Your Speech 🎤
      </H1>

      <P className="text-center mb-8">
        Tap below to analyze your speech pattern and get personalized exercises.
      </P>

      <TouchableOpacity
        className="bg-teal-500 px-8 py-4 rounded-full"
        onPress={() => router.push('/demo')}
      >
        <Text className="text-white font-bold text-lg">
          Start Detection
        </Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}