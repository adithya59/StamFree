import { auth, db } from '@/config/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View
} from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, H2, Label, P } from '@/components/ui/Typography';

interface PhonemeData {
  id: string;
  phoneme: string;
  tier: number;
  example: string;
  category: string;
}

interface UserPlaylist {
  activePhonemes: string[];
  masteredPhonemes: string[];
  phonemeStats: Record<string, {
    attempts: number;
    successCount: number;
  }>;
}

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<UserPlaylist | null>(null);
  const [phonemePool, setPhonemePool] = useState<Record<string, PhonemeData>>({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Fetch Phoneme Pool (Static-ish data)
    const fetchPool = async () => {
      try {
        const snap = await getDocs(collection(db, 'snake_phoneme_pool'));
        const pool: Record<string, PhonemeData> = {};
        snap.forEach((d) => {
          pool[d.id] = d.data() as PhonemeData;
        });
        setPhonemePool(pool);
      } catch (e) {
        console.error('Error fetching phoneme pool:', e);
      }
    };

    fetchPool();

    // 2. Listen to Playlist Changes
    const playlistRef = doc(db, `users/${user.uid}/snake_progress/playlist`);
    const unsubscribe = onSnapshot(playlistRef, (snap) => {
      if (snap.exists()) {
        setPlaylist(snap.data() as UserPlaylist);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to playlist:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderPhonemeItem = (id: string, isMastered: boolean) => {
    const data = phonemePool[id];
    const stats = playlist?.phonemeStats?.[id];
    if (!data) return null;

    const hits = stats?.successCount || 0;
    const attempts = stats?.attempts || 0;
    const percentage = attempts > 0 ? Math.round((hits / attempts) * 100) : 0;

    return (
      <View 
        key={id} 
        className={`w-[48%] bg-white dark:bg-slate-800 rounded-2xl p-4 border shadow-sm mb-3 ${
          isMastered ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800' : 'border-slate-100 dark:border-slate-700'
        }`}
      >
        <View className="flex-row justify-between items-start mb-1">
          <Text className="text-2xl font-black text-brand-primary dark:text-brand-light">{data.phoneme}</Text>
          {isMastered && (
            <MaterialCommunityIcons name="check-decagram" size={20} color="#059669" />
          )}
        </View>
        <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-3">{data.example}</Text>
        
        <View className="flex-row justify-between items-center w-full">
          <View className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
            <Text className="text-blue-600 dark:text-blue-300 text-[10px] font-bold">Tier {data.tier}</Text>
          </View>
          {stats && attempts > 0 && (
            <View className="bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/50">
              <Text className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">{hits}/{attempts} ({percentage}%)</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
        <P className="mt-4 text-slate-400">Loading your progress...</P>
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
        <View className="px-6 pt-4 mb-6">
          <H1 className="text-brand-primary mb-2">Your Journey</H1>
          <P className="text-slate-600 dark:text-slate-400">Track your mastered sounds and current goals.</P>
        </View>

        {/* Snake Game Section */}
        <View className="mx-4 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <View className="flex-row items-center gap-4 mb-6">
            <View className="w-14 h-14 rounded-full bg-emerald-500 items-center justify-center shadow-lg shadow-emerald-500/30">
              <MaterialCommunityIcons name="snake" size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <H2 className="text-slate-800 dark:text-white">Snake</H2>
              <P className="text-xs text-slate-500 dark:text-slate-400">Master your sounds by holding them long and smooth.</P>
            </View>
          </View>

          <View className="h-[1px] bg-slate-100 dark:bg-slate-700 w-full mb-6" />

          {/* Active Section */}
          <View className="mb-8">
            <View className="flex-row items-center gap-2 mb-4">
              <MaterialCommunityIcons name="bullseye-arrow" size={20} color="#0D9488" />
              <Label className="text-slate-600 dark:text-slate-300">Currently Practicing</Label>
            </View>
            
            <View className="flex-row flex-wrap gap-[4%]">
              {playlist?.activePhonemes.map((id) => renderPhonemeItem(id, false))}
              {(!playlist?.activePhonemes || playlist.activePhonemes.length === 0) && (
                <Text className="text-slate-400 text-sm italic w-full text-center py-4">No active sounds. Start a game to begin!</Text>
              )}
            </View>
          </View>

          {/* Mastered Section */}
          <View>
            <View className="flex-row items-center gap-2 mb-4">
              <MaterialCommunityIcons name="trophy" size={20} color="#F59E0B" />
              <Label className="text-slate-600 dark:text-slate-300">Mastered Sounds</Label>
            </View>
            
            <View className="flex-row flex-wrap gap-[4%]">
              {playlist?.masteredPhonemes.map((id) => renderPhonemeItem(id, true))}
              {(!playlist?.masteredPhonemes || playlist.masteredPhonemes.length === 0) && (
                <View className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                  <MaterialCommunityIcons name="trophy-outline" size={32} color="#CBD5E1" className="mb-2" />
                  <Text className="text-slate-400 text-xs text-center px-4">Your mastered sounds will appear here once you master a sound!</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Coming Soon Section */}
        <View className="mx-4 bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-5 border border-dashed border-slate-200 dark:border-slate-700 opacity-70">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 rounded-full bg-slate-400 items-center justify-center">
              <MaterialCommunityIcons name="tortoise" size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <H2 className="text-slate-600 dark:text-slate-400">Turtle</H2>
              <P className="text-xs text-slate-500 dark:text-slate-500">Coming soon: Track your speech rate and phrasing!</P>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}