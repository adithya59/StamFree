import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, FlatList, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TurtleProgressModalProps {
  visible: boolean;
  onClose: () => void;
  totalXP: number;
  tier1Unlocked: boolean;
  tier2Unlocked: boolean;
  tier3Unlocked: boolean;
  masteredCount: number;
  activeCount: number;
  lockedCount: number;
  masteredSentences?: string[];
  activeSentences?: string[];
  lockedSentences?: string[];
}

type ViewMode = 'overview' | 'mastered' | 'active' | 'locked';

export function TurtleProgressModal({
  visible,
  onClose,
  totalXP,
  tier1Unlocked,
  tier2Unlocked,
  tier3Unlocked,
  masteredCount,
  activeCount,
  lockedCount,
  masteredSentences = [],
  activeSentences = [],
  lockedSentences = []
}: TurtleProgressModalProps) {
  
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const getTierStatus = (tier: number, unlocked: boolean, xpRequired: number) => {
    if (unlocked) return { status: 'Unlocked', color: 'bg-emerald-500', icon: 'checkmark-circle' as const };
    if (totalXP >= xpRequired) return { status: 'Ready to Unlock', color: 'bg-amber-500', icon: 'alert-circle' as const };
    return { status: `${xpRequired - totalXP} XP needed`, color: 'bg-slate-400', icon: 'lock-closed' as const };
  };

  const tier1Status = getTierStatus(1, tier1Unlocked, 0);
  const tier2Status = getTierStatus(2, tier2Unlocked, 500);
  const tier3Status = getTierStatus(3, tier3Unlocked, 1500);

  const renderDetailView = () => {
    let title = '';
    let data: string[] = [];
    let emptyMessage = '';
    let headerBg = '';
    let headerTextColor = '';
    let cardBg = '';
    let cardTextColor = '';

    switch (viewMode) {
      case 'mastered':
        title = 'Mastered Sentences';
        data = masteredSentences;
        emptyMessage = 'No sentences mastered yet. Keep practicing!';
        headerBg = 'bg-emerald-600';
        headerTextColor = 'text-emerald-100';
        cardBg = 'bg-emerald-100';
        cardTextColor = 'text-emerald-600';
        break;
      case 'active':
        title = 'Active Sentences';
        data = activeSentences;
        emptyMessage = 'No active sentences.';
        headerBg = 'bg-blue-600';
        headerTextColor = 'text-blue-100';
        cardBg = 'bg-blue-100';
        cardTextColor = 'text-blue-600';
        break;
      case 'locked':
        title = 'Locked Sentences';
        data = lockedSentences;
        emptyMessage = 'All sentences unlocked!';
        headerBg = 'bg-slate-600';
        headerTextColor = 'text-slate-100';
        cardBg = 'bg-slate-100';
        cardTextColor = 'text-slate-600';
        break;
      default:
        return null;
    }

    return (
      <View className="flex-1">
        {/* Detail Header */}
        <View className={`${headerBg} p-6 flex-row items-center`}>
          <TouchableOpacity onPress={() => setViewMode('overview')} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-2xl font-black">{title}</Text>
            <Text className={`${headerTextColor} text-sm mt-1`}>{data.length} total</Text>
          </View>
        </View>

        {/* Sentence List */}
        <ScrollView className="flex-1 p-4">
          {data.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
              <Text className="text-slate-400 text-center mt-4">{emptyMessage}</Text>
            </View>
          ) : (
            data.map((sentence, index) => (
              <View key={index} className="bg-white dark:bg-slate-800 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-700">
                <View className="flex-row items-start">
                  <View className={`w-8 h-8 rounded-full ${cardBg} items-center justify-center mr-3 mt-0.5`}>
                    <Text className={`${cardTextColor} font-bold text-xs`}>{index + 1}</Text>
                  </View>
                  <Text className="flex-1 text-slate-700 dark:text-slate-200 text-base leading-6">{sentence}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Close Button */}
        <View className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <TouchableOpacity 
            className="bg-slate-600 dark:bg-slate-700 p-4 rounded-2xl items-center"
            onPress={() => setViewMode('overview')}
          >
            <Text className="text-white font-bold text-base">Back to Overview</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (viewMode !== 'overview') {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center px-4">
          <LinearGradient
            colors={isDark ? ['#0f172a', '#1e293b'] : ['#f0fdf4', '#dcfce7']}
            className="rounded-[32px] w-full max-w-md h-[80vh] shadow-2xl overflow-hidden"
          >
            {renderDetailView()}
          </LinearGradient>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/70 justify-center items-center px-4">
        <LinearGradient
          colors={isDark ? ['#0f172a', '#1e293b'] : ['#f0fdf4', '#dcfce7']}
          className="rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <View className="bg-emerald-600 dark:bg-emerald-700 p-6 items-center">
            <Text className="text-white text-2xl font-black">Turtle Progress</Text>
            <Text className="text-emerald-100 dark:text-emerald-200 text-sm mt-1">Your Journey So Far</Text>
          </View>

          <ScrollView className="max-h-[70vh]">
            {/* XP Section */}
            <View className="p-6 border-b border-emerald-200 dark:border-slate-700">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-700 dark:text-slate-200 text-lg font-bold">Total XP</Text>
                <View className="bg-amber-400 dark:bg-amber-500 px-4 py-2 rounded-2xl border-2 border-amber-500 dark:border-amber-600">
                  <Text className="text-amber-900 dark:text-amber-950 font-extrabold text-xl">{totalXP}</Text>
                </View>
              </View>
              
              {/* XP Progress Bar */}
              <View className="mt-4">
                <View className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-emerald-500 dark:bg-emerald-600 rounded-full"
                    style={{ width: `${Math.min((totalXP / 1500) * 100, 100)}%` }}
                  />
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-xs text-slate-500 dark:text-slate-400">0 XP</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">1500 XP (Max)</Text>
                </View>
              </View>
            </View>

            {/* Tier Unlock Status */}
            <View className="p-6 border-b border-emerald-200 dark:border-slate-700">
              <Text className="text-slate-700 dark:text-slate-200 text-lg font-bold mb-4">Difficulty Tiers</Text>
              
              {/* Tier 1 */}
              <View className="flex-row items-center mb-3 bg-white dark:bg-slate-800 p-3 rounded-2xl">
                <View className={`w-12 h-12 ${tier1Status.color} rounded-full items-center justify-center mr-3`}>
                  <Ionicons name={tier1Status.icon} size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 dark:text-slate-200 font-bold">Tier 1: Easy</Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">{tier1Status.status}</Text>
                </View>
              </View>

              {/* Tier 2 */}
              <View className="flex-row items-center mb-3 bg-white dark:bg-slate-800 p-3 rounded-2xl">
                <View className={`w-12 h-12 ${tier2Status.color} rounded-full items-center justify-center mr-3`}>
                  <Ionicons name={tier2Status.icon} size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 dark:text-slate-200 font-bold">Tier 2: Medium</Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">{tier2Status.status}</Text>
                </View>
                <Text className="text-xs text-slate-400 dark:text-slate-500">500 XP</Text>
              </View>

              {/* Tier 3 */}
              <View className="flex-row items-center bg-white dark:bg-slate-800 p-3 rounded-2xl">
                <View className={`w-12 h-12 ${tier3Status.color} rounded-full items-center justify-center mr-3`}>
                  <Ionicons name={tier3Status.icon} size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 dark:text-slate-200 font-bold">Tier 3: Hard</Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-xs">{tier3Status.status}</Text>
                </View>
                <Text className="text-xs text-slate-400 dark:text-slate-500">1500 XP</Text>
              </View>
            </View>

            {/* Content Progress - Now Clickable */}
            <View className="p-6">
              <Text className="text-slate-700 dark:text-slate-200 text-lg font-bold mb-4">Sentence Progress</Text>
              
              <View className="flex-row justify-between mb-3">
                <TouchableOpacity 
                  className="flex-1 bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-2xl mr-2 items-center active:bg-emerald-200 dark:active:bg-emerald-900/50"
                  onPress={() => setViewMode('mastered')}
                >
                  <Text className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{masteredCount}</Text>
                  <Text className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-1">Mastered</Text>
                  <Ionicons name="chevron-forward" size={16} color={isDark ? "#6ee7b7" : "#059669"} style={{ marginTop: 4 }} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="flex-1 bg-blue-100 dark:bg-blue-900/30 p-4 rounded-2xl mx-1 items-center active:bg-blue-200 dark:active:bg-blue-900/50"
                  onPress={() => setViewMode('active')}
                >
                  <Text className="text-4xl font-black text-blue-600 dark:text-blue-400">{activeCount}</Text>
                  <Text className="text-xs text-blue-700 dark:text-blue-300 font-semibold mt-1">Active</Text>
                  <Ionicons name="chevron-forward" size={16} color={isDark ? "#93c5fd" : "#2563EB"} style={{ marginTop: 4 }} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="flex-1 bg-slate-100 dark:bg-slate-700 p-4 rounded-2xl ml-2 items-center active:bg-slate-200 dark:active:bg-slate-600"
                  onPress={() => setViewMode('locked')}
                >
                  <Text className="text-4xl font-black text-slate-600 dark:text-slate-300">{lockedCount}</Text>
                  <Text className="text-xs text-slate-700 dark:text-slate-400 font-semibold mt-1">Locked</Text>
                  <Ionicons name="chevron-forward" size={16} color={isDark ? "#cbd5e1" : "#475569"} style={{ marginTop: 4 }} />
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                Tap to view sentences
              </Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View className="p-4 border-t border-emerald-200 dark:border-slate-700">
            <TouchableOpacity 
              className="bg-emerald-600 dark:bg-emerald-700 p-4 rounded-2xl items-center"
              onPress={onClose}
            >
              <Text className="text-white font-bold text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
