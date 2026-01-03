import { auth, db } from '@/config/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const misses = attempts - hits;
    const percentage = attempts > 0 ? Math.round((hits / attempts) * 100) : 0;

    return (
      <View key={id} style={[styles.card, isMastered && styles.cardMastered]}>
        <View style={styles.cardHeader}>
          <Text style={styles.phonemeText}>{data.phoneme}</Text>
          {isMastered && (
            <MaterialCommunityIcons name="check-decagram" size={20} color="#059669" />
          )}
        </View>
        <Text style={styles.exampleText}>{data.example}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.tierPill}>
            <Text style={styles.tierText}>Tier {data.tier}</Text>
          </View>
          {stats && attempts > 0 && (
            <View style={styles.statsPill}>
              <Text style={styles.statsText}>{hits}/{attempts} ({percentage}%)</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Speech Journey</Text>
        <Text style={styles.subtitle}>Track your mastered sounds and current goals.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Snake Game Section */}
        <View style={styles.gameSectionCard}>
          <View style={styles.gameHeader}>
            <View style={styles.gameIconCircle}>
              <MaterialCommunityIcons name="snake" size={28} color="#fff" />
            </View>
            <View>
              <Text style={styles.gameTitle}>Snake Phonation</Text>
              <Text style={styles.gameSubtitle}>Master your sounds by holding them long and smooth.</Text>
            </View>
          </View>

          <View style={styles.gameDivider} />

          {/* Active Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="bullseye-arrow" size={20} color="#1a73e8" />
              <Text style={styles.sectionTitle}>Currently Practicing</Text>
            </View>
            
            <View style={styles.grid}>
              {playlist?.activePhonemes.map((id) => renderPhonemeItem(id, false))}
              {(!playlist?.activePhonemes || playlist.activePhonemes.length === 0) && (
                <Text style={styles.emptyText}>No active sounds. Start a game to begin!</Text>
              )}
            </View>
          </View>

          {/* Mastered Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.sectionTitle}>Mastered Sounds</Text>
            </View>
            
            <View style={styles.grid}>
              {playlist?.masteredPhonemes.map((id) => renderPhonemeItem(id, true))}
              {(!playlist?.masteredPhonemes || playlist.masteredPhonemes.length === 0) && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>Your mastered sounds will appear here once you master a sound!</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Placeholder for other games */}
        <View style={[styles.gameSectionCard, styles.lockedSection]}>
          <View style={styles.gameHeader}>
            <View style={[styles.gameIconCircle, { backgroundColor: '#9CA3AF' }]}>
              <MaterialCommunityIcons name="tortoise" size={28} color="#fff" />
            </View>
            <View>
              <Text style={styles.gameTitle}>Turtle</Text>
              <Text style={styles.gameSubtitle}>Coming soon: Track your speech rate and phrasing!</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  gameSectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lockedSection: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gameIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DD1A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  gameSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    maxWidth: '85%',
  },
  gameDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  sectionDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    width: '47.5%',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardMastered: {
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  phonemeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a73e8',
  },
  exampleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  tierPill: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a73e8',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statsPill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  statsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  emptyCard: {
    width: '100%',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 13,
  },
});