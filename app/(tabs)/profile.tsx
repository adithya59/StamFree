import { auth, db } from '@/config/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { deleteUser, signOut } from 'firebase/auth';
import { deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, TouchableOpacity, View, Text, ScrollView } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, H2, Label, P } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';

const avatarMap: Record<string, any> = {
  bear: require('@/assets/profilepictures/bear.png'),
  crab: require('@/assets/profilepictures/crab.png'),
  dog: require('@/assets/profilepictures/dog.png'),
  giraffe: require('@/assets/profilepictures/giraffe.png'),
  hippo: require('@/assets/profilepictures/hippo.png'),
  lion: require('@/assets/profilepictures/lion.png'),
  rabbit: require('@/assets/profilepictures/rabbit.png'),
  tiger: require('@/assets/profilepictures/tiger.png'),
};

const avatarThemes: Record<string, { light: [string, string, ...string[]]; dark: [string, string, ...string[]] }> = {
  bear: { light: ['#d97706', '#b45309'], dark: ['#78350f', '#451a03'] },      // Amber
  crab: { light: ['#ef4444', '#b91c1c'], dark: ['#991b1b', '#7f1d1d'] },      // Red
  dog: { light: ['#eab308', '#ca8a04'], dark: ['#854d0e', '#713f12'] },       // Yellow/Brown
  giraffe: { light: ['#f59e0b', '#d97706'], dark: ['#b45309', '#78350f'] },   // Orange
  hippo: { light: ['#6366f1', '#4f46e5'], dark: ['#4338ca', '#312e81'] },     // Indigo
  lion: { light: ['#f97316', '#ea580c'], dark: ['#c2410c', '#9a3412'] },      // Orange/Red
  rabbit: { light: ['#ec4899', '#db2777'], dark: ['#be185d', '#9d174d'] },    // Pink
  tiger: { light: ['#f97316', '#c2410c'], dark: ['#9a3412', '#7c2d12'] },     // Deep Orange
  default: { light: ['#a78bfa', '#7c3aed'], dark: ['#4c1d95', '#2e1065'] },   // Purple defaults
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();

  const activeTheme = profile?.avatarId && avatarThemes[profile.avatarId] 
    ? avatarThemes[profile.avatarId] 
    : avatarThemes.default;

  const gradientColors = colorScheme === 'dark' ? activeTheme.dark : activeTheme.light;

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            await AsyncStorage.removeItem('authUser');
          } catch (e) {
            console.warn('Failed to clear storage or sign out', e);
          } finally {
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user) return;

              // Delete Firestore user data
              await deleteDoc(doc(db, 'users', user.uid));

              // Delete Auth account
              await deleteUser(user);

              // Clear local storage
              await AsyncStorage.removeItem('authUser');

              // Redirect
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert(
                'Error',
                'Please login again and retry deleting your account.'
              );
            }
          },
        },
      ]
    );
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
      }
      setLoading(false);
    }, (error) => {
      console.warn('Failed to fetch profile:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <ScreenWrapper className="justify-center items-center">
        <ActivityIndicator size="large" color="#0D9488" />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper 
        gradientColors={colorScheme === 'dark' ? ['#0f172a', '#020617'] : ['#f8fafc', '#e2e8f0']}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160, paddingTop: 20 }}>
        
        {/* Profile Header Card */}
        <LinearGradient
            colors={gradientColors} 
            className="rounded-3xl p-6 mb-8 shadow-lg items-center relative overflow-hidden"
            style={{ borderRadius: 24 }}
        >
            <TouchableOpacity 
                className="absolute top-5 right-5 bg-white/20 p-2 rounded-full z-10 active:bg-white/30"
                onPress={handleLogout}
            >
                <MaterialCommunityIcons name="logout" size={20} color="white" />
            </TouchableOpacity>

            <View className="mb-4">
                <Image
                    source={avatarThemes[profile?.avatarId] ? avatarMap[profile?.avatarId] : avatarMap['bear']}
                    className="w-28 h-28"
                    resizeMode="contain"
                />
            </View>

            <H1 className="text-white text-center mb-1 drop-shadow-sm">{profile?.childName || 'StamFree Hero'}</H1>
        </LinearGradient>

        <View className="gap-3 mb-6 px-2">
            <View className="flex-row items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <View className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full mr-4">
                     <MaterialCommunityIcons name="cake-variant" size={24} color="#9333ea" />
                </View>
                <View>
                    <Label className="text-slate-400 dark:text-slate-500 text-xs uppercase font-medium mb-0.5">Age</Label>
                    <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {profile?.childAge || '-'} <Text className="text-sm font-medium text-slate-400">years old</Text>
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <View className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mr-4">
                     <MaterialCommunityIcons name="bullseye-arrow" size={24} color="#2563eb" />
                </View>
                <View className="flex-1">
                    <Label className="text-slate-400 dark:text-slate-500 text-xs uppercase font-medium mb-0.5">Speech Focus</Label>
                    <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {profile?.speechIssues?.length > 0 
                            ? profile.speechIssues.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') 
                            : 'General Practice'}
                    </Text>
                </View>
            </View>
        </View>

        <View className="space-y-4 px-2">
            <Label className="ml-1 mb-2">Account Settings</Label>
            
            <TouchableOpacity
                className="flex-row items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                onPress={() => router.push('/editprofile')}
            >
                <View className="bg-teal-100 dark:bg-teal-900/40 p-2 rounded-full mr-4">
                    <MaterialCommunityIcons name="account-edit" size={22} color="#0d9488" />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">Edit Profile</Text>
                    <Text className="text-xs text-slate-500">Update name, avatar, and age</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
                className="flex-row items-center bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm mt-4"
                onPress={handleDeleteAccount}
            >
                <View className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-4">
                    <MaterialCommunityIcons name="delete-outline" size={22} color="#ef4444" />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-semibold text-red-600 dark:text-red-400">Delete Account</Text>
                    <Text className="text-xs text-red-400/80">Permanently remove all data</Text>
                </View>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}
