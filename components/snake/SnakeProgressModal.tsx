import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PhonemeData {
  id: string;
  phoneme: string;
  tier: number;
  example: string;
  category: string;
}

interface SnakeProgressModalProps {
  visible: boolean;
  onClose: () => void;
  activePhonemes: PhonemeData[];
  masteredPhonemes: PhonemeData[];
  lockedPhonemes: PhonemeData[];
  phonemeStats: Record<string, {
    attempts: number;
    successCount: number;
  }>;
}

type ViewMode = 'overview' | 'mastered' | 'active' | 'locked';

export function SnakeProgressModal({
  visible,
  onClose,
  activePhonemes,
  masteredPhonemes,
  lockedPhonemes,
  phonemeStats,
}: SnakeProgressModalProps) {
  
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderPhonemeItem = (phoneme: PhonemeData, index: number) => {
    const stats = phonemeStats[phoneme.id];
    const hits = stats?.successCount || 0;
    const attempts = stats?.attempts || 0;
    const percentage = attempts > 0 ? Math.round((hits / attempts) * 100) : 0;

    return (
      <View key={phoneme.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-700">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1">
            <Text className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{phoneme.phoneme}</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">{phoneme.example}</Text>
          </View>
          <View className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
            <Text className="text-blue-600 dark:text-blue-300 text-xs font-bold">Tier {phoneme.tier}</Text>
          </View>
        </View>
        {stats && attempts > 0 && (
          <View className="flex-row items-center gap-2">
            <View className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <View 
                className="h-full bg-amber-500 dark:bg-amber-600 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </View>
            <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">{hits}/{attempts}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDetailView = () => {
    let title = '';
    let data: PhonemeData[] = [];
    let emptyMessage = '';
    let headerBg = '';
    let iconName: any = 'sound-wave';
    let iconColor = '';

    switch (viewMode) {
      case 'mastered':
        title = 'Mastered Sounds';
        data = masteredPhonemes;
        emptyMessage = 'No sounds mastered yet. Keep practicing!';
        headerBg = 'bg-emerald-600 dark:bg-emerald-700';
        iconName = 'trophy';
        iconColor = '#fff';
        break;
      case 'active':
        title = 'Currently Practicing';
        data = activePhonemes;
        emptyMessage = 'No active sounds.';
        headerBg = 'bg-blue-600 dark:bg-blue-700';
        iconName = 'bullseye-arrow';
        iconColor = '#fff';
        break;
      case 'locked':
        title = 'Locked Sounds';
        data = lockedPhonemes;
        emptyMessage = 'All sounds unlocked!';
        headerBg = 'bg-slate-600 dark:bg-slate-700';
        iconName = 'lock';
        iconColor = '#fff';
        break;
      default:
        return null;
    }

    return (
      <View className="flex-1">
        {/* Detail Header */}
        <View className={`${headerBg} p-6 flex-row items-center`}>
          <TouchableOpacity onPress={() => setViewMode('overview')} className="mr-3">
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name={iconName} size={28} color={iconColor} />
          <View className="ml-3 flex-1">
            <Text className="text-white text-2xl font-black">{title}</Text>
            <Text className="text-white/80 text-sm mt-1">{data.length} total</Text>
          </View>
        </View>

        {/* Sound List */}
        <ScrollView className="flex-1 p-4 bg-emerald-50 dark:bg-slate-900">
          {data.length === 0 ? (
            <View className="items-center justify-center py-12">
              <MaterialCommunityIcons name="music-note-off-outline" size={64} color="#CBD5E1" />
              <Text className="text-slate-400 dark:text-slate-500 text-center mt-4">{emptyMessage}</Text>
            </View>
          ) : (
            data.map((phoneme, index) => renderPhonemeItem(phoneme, index))
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
            <View className="flex-row items-center gap-3 mb-2">
              <MaterialCommunityIcons name="snake" size={32} color="#fff" />
              <Text className="text-white text-2xl font-black">Snake Progress</Text>
            </View>
            <Text className="text-emerald-100 dark:text-emerald-200 text-sm">Your Sound Journey</Text>
          </View>

          <ScrollView className="max-h-[60vh] bg-emerald-50 dark:bg-slate-900">
            {/* Content Progress - Clickable */}
            <View className="p-6">
              <Text className="text-slate-700 dark:text-slate-200 text-lg font-bold mb-4">Your Sounds</Text>
              
              <View className="gap-3">
                <TouchableOpacity 
                  className="bg-emerald-100 dark:bg-emerald-900/30 p-5 rounded-2xl active:bg-emerald-200 dark:active:bg-emerald-900/50 border-2 border-emerald-200 dark:border-emerald-800"
                  onPress={() => setViewMode('mastered')}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <MaterialCommunityIcons name="trophy" size={24} color={isDark ? "#6ee7b7" : "#059669"} />
                      <View>
                        <Text className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Mastered</Text>
                        <Text className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{masteredPhonemes.length}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? "#6ee7b7" : "#059669"} />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-blue-100 dark:bg-blue-900/30 p-5 rounded-2xl active:bg-blue-200 dark:active:bg-blue-900/50 border-2 border-blue-200 dark:border-blue-800"
                  onPress={() => setViewMode('active')}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <MaterialCommunityIcons name="bullseye-arrow" size={24} color={isDark ? "#93c5fd" : "#2563EB"} />
                      <View>
                        <Text className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Active</Text>
                        <Text className="text-3xl font-black text-blue-600 dark:text-blue-400">{activePhonemes.length}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? "#93c5fd" : "#2563EB"} />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-slate-100 dark:bg-slate-700 p-5 rounded-2xl active:bg-slate-200 dark:active:bg-slate-600 border-2 border-slate-200 dark:border-slate-600"
                  onPress={() => setViewMode('locked')}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <MaterialCommunityIcons name="lock" size={24} color={isDark ? "#cbd5e1" : "#475569"} />
                      <View>
                        <Text className="text-xs text-slate-700 dark:text-slate-400 font-semibold">Locked</Text>
                        <Text className="text-3xl font-black text-slate-600 dark:text-slate-300">{lockedPhonemes.length}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={isDark ? "#cbd5e1" : "#475569"} />
                  </View>
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                Tap to view sounds
              </Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <View className="p-4 border-t border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-900">
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
