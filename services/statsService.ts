import { auth, db } from '@/config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface UserStats {
  currentStreak: number;
  lastActivityDate: string | null; // ISO Date YYYY-MM-DD
  sessionsThisWeek: number;
  weekStartDate: string; // ISO Date YYYY-MM-DD of the current week's Monday
  totalXP: number;
}

function getMonday(d: Date) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

const DEFAULT_STATS: UserStats = {
  currentStreak: 0,
  lastActivityDate: null,
  sessionsThisWeek: 0,
  weekStartDate: getMonday(new Date()).toISOString().split('T')[0],
  totalXP: 0,
};

export async function getUserStats(): Promise<UserStats> {
  const user = auth.currentUser;
  if (!user) return DEFAULT_STATS;

  const statsRef = doc(db, `users/${user.uid}/stats/summary`);
  const snap = await getDoc(statsRef);

  if (snap.exists()) {
    const data = snap.data() as UserStats;
    // Check if week needs reset
    const currentMonday = getMonday(new Date()).toISOString().split('T')[0];
    if (data.weekStartDate !== currentMonday) {
      // New week, reset weekly counter but keep streak info
      const updatedStats = {
        ...data,
        sessionsThisWeek: 0,
        weekStartDate: currentMonday,
      };
      await updateDoc(statsRef, updatedStats);
      return updatedStats;
    }
    // Ensure totalXP exists (migration)
    if (typeof data.totalXP === 'undefined') {
      return { ...data, totalXP: 0 };
    }
    return data;
  } else {
    // Initialize if missing
    await setDoc(statsRef, DEFAULT_STATS);
    return DEFAULT_STATS;
  }
}

/**
 * Called after a game/exercise is completed.
 * Updates streak, weekly session count, and XP.
 */
export async function updateUserStatsOnActivity(xpGained: number = 0) {
  const user = auth.currentUser;
  if (!user) return;

  const statsRef = doc(db, `users/${user.uid}/stats/summary`);
  const today = new Date().toISOString().split('T')[0];
  
  // Transaction-like update (using read-modify-write for simplicity in client SDK)
  const currentStats = await getUserStats();
  
  let { currentStreak, lastActivityDate, sessionsThisWeek, totalXP } = currentStats;

  // 1. Update Sessions This Week
  sessionsThisWeek += 1;

  // 2. Update Streak
  if (lastActivityDate !== today) {
    // First activity of the day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActivityDate === yesterdayStr) {
      // Consecutive day
      currentStreak += 1;
    } else {
      // Streak broken (or first ever)
      currentStreak = 1;
    }
    lastActivityDate = today;
  }

  // 3. Update XP
  if (typeof totalXP !== 'number') totalXP = 0;
  totalXP += xpGained;

  const newStats = {
    ...currentStats,
    currentStreak,
    lastActivityDate,
    sessionsThisWeek,
    totalXP,
  };

  await setDoc(statsRef, newStats);
  return newStats;
}