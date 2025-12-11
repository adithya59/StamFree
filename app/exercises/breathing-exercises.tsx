import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  inhaleCount: number;
  holdCount: number;
  exhaleCount: number;
  icon: string;
  color: string;
}

const exercises: BreathingExercise[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal breathing pattern: inhale, hold, exhale, hold',
    inhaleCount: 4,
    holdCount: 4,
    exhaleCount: 4,
    icon: 'square-outline',
    color: '#4ECDC4',
  },
  {
    id: '478',
    name: '4-7-8 Technique',
    description: 'Calming technique with extended exhale',
    inhaleCount: 4,
    holdCount: 7,
    exhaleCount: 8,
    icon: 'numeric-8-box-outline',
    color: '#95E1D3',
  },
  {
    id: 'relaxation',
    name: 'Relaxation Breathing',
    description: 'Slow, deep breathing for relaxation',
    inhaleCount: 3,
    holdCount: 2,
    exhaleCount: 6,
    icon: 'spa',
    color: '#80DEEA',
  },
];

export default function BreathingExercisesScreen() {
  const navigation = useNavigation();
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [isTimer, setIsTimer] = useState(false);

  const handleBack = () => {
    router.back();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Breathing Exercises',
      headerLeft: () => (
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1a73e8" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const startExercise = (exerciseId: string) => {
    setActiveExercise(exerciseId);
  };

  const handleStartTimer = () => {
    setIsTimer(true);
  };

  const handleStopTimer = () => {
    setIsTimer(false);
  };

  const exercise = exercises.find((e) => e.id === activeExercise);

  if (activeExercise && exercise) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.exerciseContent}>
            <TouchableOpacity
              onPress={() => setActiveExercise(null)}
              style={styles.backToList}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color="#1a73e8" />
              <Text style={styles.backToListText}>Back to List</Text>
            </TouchableOpacity>

            <View style={[styles.exerciseCard, { backgroundColor: exercise.color }]}>
              <MaterialCommunityIcons
                name={exercise.icon as any}
                size={60}
                color="#fff"
              />
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseDescription}>{exercise.description}</Text>
            </View>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>How it works:</Text>
              <View style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Inhale</Text>
                  <Text style={styles.stepValue}>{exercise.inhaleCount} seconds</Text>
                </View>
              </View>

              <View style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Hold</Text>
                  <Text style={styles.stepValue}>{exercise.holdCount} seconds</Text>
                </View>
              </View>

              <View style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepLabel}>Exhale</Text>
                  <Text style={styles.stepValue}>{exercise.exhaleCount} seconds</Text>
                </View>
              </View>
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Tips:</Text>
              <Text style={styles.tipText}>
                • Sit in a comfortable position with your back straight
              </Text>
              <Text style={styles.tipText}>
                • Breathe through your nose if possible
              </Text>
              <Text style={styles.tipText}>
                • Repeat this cycle 5-10 times for best results
              </Text>
              <Text style={styles.tipText}>
                • Practice daily for better speech control
              </Text>
            </View>

            {!isTimer ? (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: exercise.color }]}
                onPress={handleStartTimer}
              >
                <MaterialCommunityIcons name="play" size={24} color="#fff" />
                <Text style={styles.buttonText}>Start Timer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.stopButton]}
                onPress={handleStopTimer}
              >
                <MaterialCommunityIcons name="stop" size={24} color="#fff" />
                <Text style={styles.buttonText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Choose an Exercise</Text>
        <Text style={styles.sectionSubtitle}>
          Breathing exercises help improve breath control for better speech
        </Text>

        <View style={styles.exercisesGrid}>
          {exercises.map((ex) => (
            <TouchableOpacity
              key={ex.id}
              style={styles.exerciseTile}
              onPress={() => startExercise(ex.id)}
            >
              <View
                style={[
                  styles.exerciseTileIcon,
                  { backgroundColor: ex.color },
                ]}
              >
                <MaterialCommunityIcons
                  name={ex.icon as any}
                  size={40}
                  color="#fff"
                />
              </View>
              <Text style={styles.exerciseTileName}>{ex.name}</Text>
              <Text style={styles.exerciseTileDesc}>{ex.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Benefits of Breathing Exercises:</Text>
          <Text style={styles.benefitItem}>✓ Reduces speech anxiety and tension</Text>
          <Text style={styles.benefitItem}>✓ Improves breath control during speech</Text>
          <Text style={styles.benefitItem}>✓ Enhances relaxation and focus</Text>
          <Text style={styles.benefitItem}>✓ Helps manage stuttering symptoms</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  exercisesGrid: {
    gap: 12,
    marginBottom: 24,
  },
  exerciseTile: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  exerciseTileIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseTileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  exerciseTileDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  exerciseContent: {
    gap: 16,
  },
  backToList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backToListText: {
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  exerciseDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a73e8',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  stepValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  tipsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD93D',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  benefitsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0EA5E9',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 13,
    color: '#0369A1',
    marginBottom: 6,
  },
});