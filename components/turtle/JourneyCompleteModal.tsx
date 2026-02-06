import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { H1, H2, P } from '../ui/Typography';
import { Button } from '../ui/Button';

interface JourneyCompleteModalProps {
  visible: boolean;
  journeyNumber: number; // 1, 2, or 3
  onContinue: () => void;
}

const JOURNEY_DATA = [
  { 
    title: 'Forest Path Complete!', 
    icon: '🚩', 
    message: 'Great pacing! Ready for the river?' 
  },
  { 
    title: 'River Swim Complete!', 
    icon: '🍓', 
    message: 'Amazing swimming! Almost there!' 
  },
  { 
    title: 'Fruit Tree Reached!', 
    icon: '🏆', 
    message: 'You did it! Fantastic work!' 
  },
];

export function JourneyCompleteModal({ 
  visible, 
  journeyNumber, 
  onContinue 
}: JourneyCompleteModalProps) {
  const data = JOURNEY_DATA[journeyNumber - 1] || JOURNEY_DATA[0];
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/60 justify-center items-center px-4">
        <View className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-sm items-center shadow-2xl">
          <Text className="text-7xl mb-4">{data.icon}</Text>
          <H2 className="text-center text-slate-800 dark:text-white mb-2">
            {data.title}
          </H2>
          <P className="text-center text-slate-600 dark:text-slate-300 mb-6">
            {data.message}
          </P>
          <Button 
            title="Continue Adventure" 
            onPress={onContinue}
            className="w-full"
          />
        </View>
      </View>
    </Modal>
  );
}
