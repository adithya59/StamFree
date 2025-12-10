import { auth } from '@/config/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useNavigation } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('exercises');
  const scaleAnim = new Animated.Value(1);

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('authUser');
    } catch (e) {
      console.warn('Failed to clear storage or sign out', e);
    } finally {
      router.replace('/(auth)/login');
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'StamFree AI',
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleLogout]);

  const renderExercises = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Let&apos;s Practice! 🎯</Text>
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity 
          style={[styles.exerciseCard, styles.breathingCard]} 
          onPress={animatePress}>
          <MaterialCommunityIcons name="weather-windy" size={32} color="#fff" />
          <Text style={styles.exerciseTitle}>Breathing Games</Text>
          <Text style={styles.exerciseDescription}>Take deep breaths with our friendly dragon! 🐉</Text>
        </TouchableOpacity>
      </Animated.View>

      <TouchableOpacity style={[styles.exerciseCard, styles.wordCard]}>
        <MaterialCommunityIcons name="microphone" size={32} color="#fff" />
        <Text style={styles.exerciseTitle}>Word Fun</Text>
        <Text style={styles.exerciseDescription}>Play with words and earn stars! ⭐</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.exerciseCard, styles.fluencyCard]}>
        <MaterialCommunityIcons name="star-face" size={32} color="#fff" />
        <Text style={styles.exerciseTitle}>Speech Adventure</Text>
        <Text style={styles.exerciseDescription}>Join our magical speaking journey! 🚀</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDailyReport = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Your Amazing Progress! 🌟</Text>
      <View style={[styles.reportCard, styles.progressCard]}>
        <Text style={styles.reportTitle}>Today&apos;s Achievements</Text>
        <View style={styles.achievementRow}>
          <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
          <Text style={styles.reportMetric}>3 Games Completed!</Text>
        </View>
        <View style={styles.achievementRow}>
          <MaterialCommunityIcons name="clock" size={24} color="#4CAF50" />
          <Text style={styles.reportMetric}>25 Minutes of Fun!</Text>
        </View>
        <View style={styles.achievementRow}>
          <MaterialCommunityIcons name="star" size={24} color="#FF9800" />
          <Text style={styles.reportMetric}>Super Score: 7.5! 🎉</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'exercises' && styles.activeTab]} 
          onPress={() => setActiveTab('exercises')}>
          <MaterialCommunityIcons 
            name="rocket" 
            size={24} 
            color={activeTab === 'exercises' ? '#FF6B6B' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'exercises' && styles.activeTabText]}>
            Play & Learn
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'report' && styles.activeTab]} 
          onPress={() => setActiveTab('report')}>
          <MaterialCommunityIcons 
            name="chart-line" 
            size={24} 
            color={activeTab === 'report' ? '#FF6B6B' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'report' && styles.activeTabText]}>
            My Progress
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} bounces={true}>
        {activeTab === 'exercises' ? renderExercises() : renderDailyReport()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#FFE0E0',
    justifyContent: 'space-around',
  },
  tab: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    color: '#2D3436',
    textAlign: 'center',
  },
  exerciseCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    alignItems: 'center',
  },
  breathingCard: {
    backgroundColor: '#FF6B6B',
  },
  wordCard: {
    backgroundColor: '#4ECDC4',
  },
  fluencyCard: {
    backgroundColor: '#45B7D1',
  },
  exerciseTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 8,
    color: '#fff',
  },
  exerciseDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
  },
  progressCard: {
    backgroundColor: '#FFF9C4',
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#2D3436',
    textAlign: 'center',
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
  },
  reportMetric: {
    fontSize: 16,
    color: '#2D3436',
    fontWeight: '600',
  },
  headerButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6 
  },
  headerButtonText: { 
    color: '#FF6B6B', 
    fontWeight: '600' 
  },
});