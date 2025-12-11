import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WordGame {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const games: WordGame[] = [
  {
    id: 'rhymes',
    name: 'Rhyme Match',
    description: 'Match words that rhyme with each other',
    icon: 'format-quote-close',
    color: '#FF6B6B',
    difficulty: 'Easy',
  },
  {
    id: 'syllables',
    name: 'Syllable Count',
    description: 'Count syllables in given words',
    icon: 'music-note',
    color: '#4ECDC4',
    difficulty: 'Medium',
  },
  {
    id: 'tongue-twisters',
    name: 'Tongue Twisters',
    description: 'Practice challenging tongue twisters',
    icon: 'chat-processing-outline',
    color: '#FFD93D',
    difficulty: 'Hard',
  },
  {
    id: 'word-scramble',
    name: 'Word Scramble',
    description: 'Unscramble letters to form words',
    icon: 'shuffle-variant',
    color: '#A78BFA',
    difficulty: 'Medium',
  },
];

export default function WordGamesScreen() {
  const navigation = useNavigation();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleBack = () => {
    router.back();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Word Games',
      headerLeft: () => (
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1a73e8" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const startGame = (gameId: string) => {
    setSelectedGame(gameId);
    setIsPlaying(true);
    setScore(0);
  };

  const backToList = () => {
    setSelectedGame(null);
    setIsPlaying(false);
    setScore(0);
  };

  const game = games.find((g) => g.id === selectedGame);

  if (isPlaying && game) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            onPress={backToList}
            style={styles.backToList}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#1a73e8" />
            <Text style={styles.backToListText}>Back to Games</Text>
          </TouchableOpacity>

          <View style={[styles.gameHeader, { backgroundColor: game.color }]}>
            <MaterialCommunityIcons
              name={game.icon as any}
              size={50}
              color="#fff"
            />
            <Text style={styles.gameName}>{game.name}</Text>
            <View style={styles.scoreBoard}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
          </View>

          <View style={styles.gameCard}>
            <Text style={styles.gameTitle}>Round 1</Text>
            <Text style={styles.question}>🎯 Word Challenge</Text>

            {game.id === 'rhymes' && (
              <>
                <Text style={styles.prompt}>
                  Which word rhymes with &quot;cat&quot;?
                </Text>
                <View style={styles.optionsContainer}>
                  {['hat', 'dog', 'tree', 'car'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        option === 'hat' && styles.correctOption,
                      ]}
                      onPress={() => {
                        if (option === 'hat') {
                          setScore(score + 10);
                        }
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {game.id === 'syllables' && (
              <>
                <Text style={styles.prompt}>
                  How many syllables in &quot;butterfly&quot;?
                </Text>
                <View style={styles.optionsContainer}>
                  {['2', '3', '4', '5'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        option === '3' && styles.correctOption,
                      ]}
                      onPress={() => {
                        if (option === '3') {
                          setScore(score + 15);
                        }
                      }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {game.id === 'tongue-twisters' && (
              <>
                <Text style={styles.tonguetwister}>
                  &quot;She sells seashells by the seashore&quot;
                </Text>
                <Text style={styles.prompt}>
                  Try saying this 5 times fast! 🎤
                </Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: game.color }]}
                >
                  <MaterialCommunityIcons
                    name="microphone"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.buttonText}>Record Practice</Text>
                </TouchableOpacity>
              </>
            )}

            {game.id === 'word-scramble' && (
              <>
                <Text style={styles.prompt}>
                  Unscramble: &quot;TAPHRELE&quot;
                </Text>
                <Text style={styles.hint}>Hint: An animal you might pet</Text>
                <View style={styles.scrambleInput}>
                  <Text style={styles.placeholderText}>
                    Type your answer here...
                  </Text>
                </View>
                <TouchableOpacity style={[styles.button, { backgroundColor: game.color }]}>
                  <Text style={styles.buttonText}>Submit Answer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Game Stats</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Difficulty</Text>
              <Text style={styles.statValue}>{game.difficulty}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current Score</Text>
              <Text style={styles.statValue}>{score} pts</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Round</Text>
              <Text style={styles.statValue}>1 of 5</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Word Games</Text>
        <Text style={styles.sectionSubtitle}>
          Fun games to improve speech and language skills
        </Text>

        <View style={styles.gamesGrid}>
          {games.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.gameTile}
              onPress={() => startGame(g.id)}
            >
              <View
                style={[
                  styles.gameTileIcon,
                  { backgroundColor: g.color },
                ]}
              >
                <MaterialCommunityIcons
                  name={g.icon as any}
                  size={40}
                  color="#fff"
                />
              </View>
              <Text style={styles.gameTileName}>{g.name}</Text>
              <Text style={styles.gameTileDesc}>{g.description}</Text>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>{g.difficulty}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 How Games Help</Text>
          <Text style={styles.infoText}>
            • Improve articulation and pronunciation
          </Text>
          <Text style={styles.infoText}>
            • Build confidence in speaking
          </Text>
          <Text style={styles.infoText}>
            • Make speech practice fun and engaging
          </Text>
          <Text style={styles.infoText}>
            • Track progress through gamification
          </Text>
        </View>

        <View style={styles.leaderboardCard}>
          <View style={styles.leaderboardHeader}>
            <MaterialCommunityIcons
              name="trophy"
              size={24}
              color="#FFD93D"
            />
            <Text style={styles.leaderboardTitle}>Top Scores This Week</Text>
          </View>
          <View style={styles.leaderboardEntry}>
            <Text style={styles.leaderboardRank}>1st</Text>
            <Text style={styles.leaderboardName}>You</Text>
            <Text style={styles.leaderboardScore}>250 pts</Text>
          </View>
          <View style={styles.leaderboardEntry}>
            <Text style={styles.leaderboardRank}>2nd</Text>
            <Text style={styles.leaderboardName}>Friend</Text>
            <Text style={styles.leaderboardScore}>180 pts</Text>
          </View>
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
  gamesGrid: {
    gap: 12,
    marginBottom: 24,
  },
  gameTile: {
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
  gameTileIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameTileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  gameTileDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
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
  gameHeader: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  gameName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    marginBottom: 16,
  },
  scoreBoard: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
  },
  question: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
  },
  prompt: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  correctOption: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  tonguetwister: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  scrambleInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0EA5E9',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0EA5E9',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#0369A1',
    marginBottom: 6,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  leaderboardRank: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  leaderboardName: {
    fontSize: 13,
    color: '#1F2937',
  },
  leaderboardScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
});