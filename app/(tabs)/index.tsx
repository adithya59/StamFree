import { GAMES, GameConfig } from '@/constants/games';
import { getUserStats, type UserStats } from '@/services/statsService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, TouchableOpacity, View, Text } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { GameCard } from '@/components/ui/GameCard';
import { H1, P } from '@/components/ui/Typography';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<UserStats | null>(null);
  const colorScheme = useColorScheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchStats = async () => {
        try {
          const data = await getUserStats();
          if (isActive) setStats(data);
        } catch (e) {
          console.error('Failed to load stats', e);
        }
      };
      fetchStats();
      return () => { isActive = false; };
    }, [])
  );

  const renderGameItem = ({ item, index }: { item: GameConfig; index: number }) => (
    <View className="flex-1 py-2">
      <Link href={item.route as any} asChild>
        <GameCard
            title={item.title}
            description={item.description}
            iconSource={item.iconSource}
            iconName={item.iconName as any}
            lottieSource={item.lottieSource}
            delay={index * 100}
            gradientColors={item.gradientColors}
            darkGradientColors={item.darkGradientColors}
            className="h-full"
            onPress={() => {}} // dummy prop to satisfy types if needed, Link overrides it
        />
      </Link>
    </View>
  );

  const renderHeader = () => (
    <View className="mb-6 mt-4">
      <View className="pt-2 pb-6">
        <H1 className="mb-2">Welcome Back! 👋</H1>
        <P>Choose an exercise to get started today.</P>
        
        <TouchableOpacity 
            className="mt-4 flex-row items-center space-x-2 rounded-xl bg-teal-50 px-4 py-3 dark:bg-teal-900/30 self-start"
            onPress={() => router.push('/demo')}
        >
          <MaterialCommunityIcons name="flask" size={20} color="#0D9488" />
          <Text className="font-semibold text-brand-primary">Open Stutter Detection Demo</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Section */}
      <Animated.View 
        entering={FadeInDown.delay(200)} 
        className="flex-row gap-3"
      >
        <LinearGradient
            colors={colorScheme === 'dark' ? ['#1e3a8a', '#172554'] : ['#60a5fa', '#3b82f6']} // Blue-400->600 (Light), Blue-900->950 (Dark)
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-1 flex-row items-center p-4 shadow-sm"
            style={{ borderRadius: 16 }}
        >
            <View className="bg-white/20 p-2 rounded-full mr-3">
                <MaterialCommunityIcons name="calendar-today" size={20} color="#FFFFFF" />
            </View>
            <View>
                <Text className="text-xs text-blue-50 uppercase font-medium">Sessions</Text>
                <Text className="text-xl font-bold text-white">
                    {stats ? stats.sessionsThisWeek : '-'}
                </Text>
            </View>
        </LinearGradient>

        <LinearGradient
            colors={colorScheme === 'dark' ? ['#78350f', '#451a03'] : ['#fbbf24', '#d97706']} // Amber-400->600 (Light), Amber-900->950 (Dark)
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-1 flex-row items-center p-4 shadow-sm"
            style={{ borderRadius: 16 }}
        >
            <View className="bg-white/20 p-2 rounded-full mr-3">
                <MaterialCommunityIcons name="star" size={20} color="#FFFFFF" />
            </View>
            <View>
                <Text className="text-xs text-amber-50 uppercase font-medium">Streak</Text>
                <Text className="text-xl font-bold text-white">
                    {stats ? stats.currentStreak : '-'} <Text className="text-xs font-normal text-white/80">days</Text>
                </Text>
            </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );

  return (
    <ScreenWrapper 
        gradientColors={colorScheme === 'dark' ? ['#0f172a', '#020617'] : ['#f8fafc', '#e2e8f0']} // Slate-50->200 (Light), Slate-900->950 (Dark)
    >
      <FlatList
        data={GAMES}
        renderItem={renderGameItem}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}