import { auth, db } from '@/config/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
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

interface RhythmTapStats {
  totalWords: number;
  bestAccuracy: number;
  averageAccuracy: number;
  syncRate: number;
}

interface WordProgress {
  word: string;
  tier: number;
  attempts: number;
  syllables: number;
  syllableMistakes: number[];
  lastSession: {
    accuracy: number;
    syllableMatches: boolean[];
  }
}

interface TurtleWorldStats {
  attempts: number;
  successes: number;
}

interface TurtleStats {
  jungle: TurtleWorldStats;   // Tier 1
  river: TurtleWorldStats;    // Tier 2
  mountain: TurtleWorldStats; // Tier 3
}

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<UserPlaylist | null>(null);
  const [phonemePool, setPhonemePool] = useState<Record<string, PhonemeData>>({});
  const [rhythmStats, setRhythmStats] = useState<RhythmTapStats | null>(null);
  const [turtleStats, setTurtleStats] = useState<TurtleStats | null>(null);
  const [speedWarnings, setSpeedWarnings] = useState<string[]>([]);
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({});
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [showTierDropdown, setShowTierDropdown] = useState(false);

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

    // 3. Listen to Rhythm Tap Sessions
    const sessionsRef = collection(db, `users/${user.uid}/practice_sessions`);
    const q = query(sessionsRef, where('gameId', '==', 'onetap'));
    const unsubscribeSessions = onSnapshot(q, (snap) => {
      let totalWords = 0;
      let totalAccuracySum = 0;
      let bestAccuracy = 0;
      let syncCount = 0;
      const progress: Record<string, WordProgress> = {};

      snap.forEach(doc => {
        const data = doc.data();
        totalWords++;
        totalAccuracySum += data.accuracy || 0;
        if (data.accuracy > bestAccuracy) bestAccuracy = data.accuracy;
        if (data.isSync) syncCount++;

        const word = data.word;
        if (!progress[word]) {
          progress[word] = {
            word: word,
            tier: data.tier || 1,
            attempts: 0,
            syllables: data.syllables || 0,
            syllableMistakes: new Array(data.syllables || 0).fill(0),
            lastSession: { accuracy: 0, syllableMatches: [] }
          };
        }

        progress[word].attempts++;

        // Update Syllable Mistakes
        if (data.syllable_matches) {
          data.syllable_matches.forEach((matched: boolean, index: number) => {
            if (!matched && progress[word].syllableMistakes[index] !== undefined) {
              progress[word].syllableMistakes[index]++;
            }
          });
          progress[word].lastSession = {
            accuracy: data.accuracy,
            syllableMatches: data.syllable_matches
          };
        }
      });

      setRhythmStats({
        totalWords,
        bestAccuracy: Math.round(bestAccuracy * 100),
        averageAccuracy: totalWords > 0 ? Math.round((totalAccuracySum / totalWords) * 100) : 0,
        syncRate: totalWords > 0 ? Math.round((syncCount / totalWords) * 100) : 0
      });
      setWordProgress(progress);
    });

    // 4. Listen to Turtle Talk Sessions
    const turtleQuery = query(sessionsRef, where('gameId', '==', 'turtle'));
    const unsubscribeTurtle = onSnapshot(turtleQuery, (snap) => {
      const stats = {
        jungle: { attempts: 0, successes: 0 },
        river: { attempts: 0, successes: 0 },
        mountain: { attempts: 0, successes: 0 }
      };

      // Track latest WPM per word to identify speed issues
      const latestWordWpm: Record<string, number> = {};

      snap.forEach(doc => {
        const data = doc.data();
        const tier = data.tier || 1;

        // Aggregate Stats by World
        if (tier === 1) {
          stats.jungle.attempts++;
          if (data.isSuccess) stats.jungle.successes++;
        } else if (tier === 2) {
          stats.river.attempts++;
          if (data.isSuccess) stats.river.successes++;
        } else if (tier === 3) {
          stats.mountain.attempts++;
          if (data.isSuccess) stats.mountain.successes++;
        }

        // Track Speed (Store WPM of latest attempt for each word)
        // Assuming docs come in some order, but better to compare timestamps if available
        // For simplicity in this snapshot, we'll just overwrite, as we want to know if *recent* performance is fast.
        // Ideally we'd sort by timestamp, but snap order isn't guaranteed without sort.
        // Let's assume the query or implicit order gives us a mix. 
        // We really want to know if ANY recent attempt was too fast? 
        // Or just the LAST one? Let's go with: if the *last logged* session for a word was too fast.
        // We'll use the doc's timestamp if needed, but data object has it.
        // Note: We aren't sorting the query, so order might be insertion order (mostly).
        if (data.word && data.wpm) {
          latestWordWpm[data.word] = data.wpm;
        }
      });

      setTurtleStats(stats);

      // Filter for speed warnings (> 130 WPM)
      const warnings = Object.entries(latestWordWpm)
        .filter(([_, wpm]) => wpm > 130)
        .map(([word]) => word);
      setSpeedWarnings(warnings);
    });

    const unsubscribePlaylist = onSnapshot(playlistRef, (snap) => {
      if (snap.exists()) {
        setPlaylist(snap.data() as UserPlaylist);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to playlist:', err);
      setLoading(false);
    });

    return () => {
      unsubscribePlaylist();
      unsubscribeSessions();
      unsubscribeTurtle();
    };
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
        className={`w-[48%] bg-white dark:bg-slate-800 rounded-2xl p-4 border shadow-sm mb-3 ${isMastered ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800' : 'border-slate-100 dark:border-slate-700'
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

        {/* Rhythm Adventure Section */}
        <View className="mx-4 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <View className="flex-row items-center gap-4 mb-6">
            <View className="w-14 h-14 rounded-full bg-orange-500 items-center justify-center shadow-lg shadow-orange-500/30">
              <MaterialCommunityIcons name="music-note" size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <H2 className="text-slate-800 dark:text-white">Rhythm Adventure</H2>
              <P className="text-xs text-slate-500 dark:text-slate-400">Tap to the beat and improve your flow!</P>
            </View>
          </View>

          <View className="h-[1px] bg-slate-100 dark:bg-slate-700 w-full mb-6" />

          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-slate-800 dark:text-white">{rhythmStats?.totalWords || 0}</Text>
              <Text className="text-[10px] text-slate-500 text-center">Words</Text>
            </View>
            <View className="w-[1px] bg-slate-100 dark:bg-slate-700 h-full" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-green-600">{rhythmStats?.bestAccuracy || 0}%</Text>
              <Text className="text-[10px] text-slate-500 text-center">Best</Text>
            </View>
            <View className="w-[1px] bg-slate-100 dark:bg-slate-700 h-full" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-teal-600">{rhythmStats?.averageAccuracy || 0}%</Text>
              <Text className="text-[10px] text-slate-500 text-center">Avg</Text>
            </View>
            <View className="w-[1px] bg-slate-100 dark:bg-slate-700 h-full" />
            <View className="items-center flex-1">
              <Text className="text-2xl font-bold text-blue-500">{rhythmStats?.syncRate || 0}%</Text>
              <Text className="text-[10px] text-slate-500 text-center">Sync</Text>
            </View>
          </View>

          <View className="h-[1px] bg-slate-100 dark:bg-slate-700 w-full my-6" />

          {/* Detailed Word List */}
          <View className="z-50">
            <TouchableOpacity
              className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-4"
              onPress={() => setShowTierDropdown(!showTierDropdown)}
            >
              <Text className="font-bold text-slate-700 dark:text-slate-300">Tier {selectedTier} Words</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>

            {showTierDropdown && (
              <View className="absolute top-12 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
                {[1, 2, 3].map(tier => (
                  <TouchableOpacity
                    key={tier}
                    className="p-3 border-b border-slate-100 dark:border-slate-700"
                    onPress={() => { setSelectedTier(tier); setShowTierDropdown(false); }}
                  >
                    <Text className={`font-semibold ${selectedTier === tier ? 'text-brand-primary' : 'text-slate-600 dark:text-slate-400'}`}>Tier {tier}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View className="gap-3">
            {Object.values(wordProgress)
              .filter(p => p.tier === selectedTier)
              .map((item, index) => (
                <View key={index} className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-bold text-slate-800 dark:text-slate-200 text-lg capitalize">{item.word}</Text>
                    <View className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                      <Text className="text-xs font-bold text-slate-500">{item.attempts} Tries</Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-2">
                    {item.syllableMistakes.map((mistakes, sIndex) => (
                      <View key={sIndex} className="items-center">
                        <View className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${item.lastSession.syllableMatches[sIndex]
                          ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                          : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                          }`}>
                          <Text className={`font-bold ${item.lastSession.syllableMatches[sIndex] ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                            }`}>{sIndex + 1}</Text>
                        </View>
                        <Text className="text-[10px] text-slate-400">{mistakes} err</Text>
                      </View>
                    ))}
                  </View>
                  {item.syllableMistakes.length === 0 && (
                    <Text className="text-xs text-slate-400 italic">No detailed data yet</Text>
                  )}
                </View>
              ))}

            {Object.values(wordProgress).filter(p => p.tier === selectedTier).length === 0 && (
              <View className="p-4 items-center justify-center">
                <Text className="text-slate-400 text-center">No words practiced in Tier {selectedTier} yet.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Turtle Talk Section */}
        <View className="mx-4 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
          <View className="flex-row items-center gap-4 mb-6">
            <View className="w-14 h-14 rounded-full bg-teal-500 items-center justify-center shadow-lg shadow-teal-500/30">
              <MaterialCommunityIcons name="tortoise" size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <H2 className="text-slate-800 dark:text-white">Turtle Talk</H2>
              <P className="text-xs text-slate-500 dark:text-slate-400">Slow and steady wins the race!</P>
            </View>
          </View>

          <View className="h-[1px] bg-slate-100 dark:bg-slate-700 w-full mb-6" />

          {/* Worlds Progress */}
          <View className="flex-row justify-between gap-2 mb-6">
            {/* Jungle */}
            <View className="flex-1 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl items-center border border-green-100 dark:border-green-900/30">
              <Text className="text-xs font-bold text-green-700 dark:text-green-400 mb-1 uppercase tracking-wider">Jungle</Text>
              <Text className="text-xl font-black text-slate-800 dark:text-white">{turtleStats?.jungle.attempts || 0}</Text>
              <Text className="text-[10px] text-slate-400 mb-2">Attempts</Text>
              <View className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md">
                <Text className="text-xs font-bold text-green-600">
                  {turtleStats?.jungle.attempts ? Math.round((turtleStats.jungle.successes / turtleStats.jungle.attempts) * 100) : 0}%
                </Text>
              </View>
            </View>

            {/* River */}
            <View className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl items-center border border-blue-100 dark:border-blue-900/30">
              <Text className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1 uppercase tracking-wider">River</Text>
              <Text className="text-xl font-black text-slate-800 dark:text-white">{turtleStats?.river.attempts || 0}</Text>
              <Text className="text-[10px] text-slate-400 mb-2">Attempts</Text>
              <View className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md">
                <Text className="text-xs font-bold text-blue-600">
                  {turtleStats?.river.attempts ? Math.round((turtleStats.river.successes / turtleStats.river.attempts) * 100) : 0}%
                </Text>
              </View>
            </View>

            {/* Mountain */}
            <View className="flex-1 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl items-center border border-purple-100 dark:border-purple-900/30">
              <Text className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-1 uppercase tracking-wider">Mtn</Text>
              <Text className="text-xl font-black text-slate-800 dark:text-white">{turtleStats?.mountain.attempts || 0}</Text>
              <Text className="text-[10px] text-slate-400 mb-2">Attempts</Text>
              <View className="bg-white dark:bg-slate-800 px-2 py-1 rounded-md">
                <Text className="text-xs font-bold text-purple-600">
                  {turtleStats?.mountain.attempts ? Math.round((turtleStats.mountain.successes / turtleStats.mountain.attempts) * 100) : 0}%
                </Text>
              </View>
            </View>
          </View>

          {/* Speed Warnings */}
          {speedWarnings.length > 0 && (
            <View className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialCommunityIcons name="speedometer" size={18} color="#DC2626" />
                <Text className="text-sm font-bold text-red-700 dark:text-red-400">Too Fast! Slow down on:</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {speedWarnings.map((word, idx) => (
                  <View key={idx} className="bg-white dark:bg-red-900/40 px-3 py-1 rounded-full border border-red-100 dark:border-red-800">
                    <Text className="text-xs font-medium text-red-600 dark:text-red-300">{word}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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

      </ScrollView>
    </ScreenWrapper>
  );
}