import 'react-native-reanimated'; // must be at the very top
import { auth } from '@/config/firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import '../global.css'; // Import NativeWind global styles

// Prevent the splash screen from only hiding when we are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // Handle user state changes
  function onAuthStateChangedHandler(user: User | null) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, onAuthStateChangedHandler);
    return subscriber; // unsubscribe on unmount
  }, []);

  // Check onboarding status when user changes
  useEffect(() => {
    async function checkOnboarding() {
      if (user) {
        // Check both new and old format
        const stutterTypes = await AsyncStorage.getItem('stutterTypes');
        const oldStutterType = await AsyncStorage.getItem('stutterType');
        setHasCompletedOnboarding(!!stutterTypes || !!oldStutterType);
      } else {
        setHasCompletedOnboarding(null);
      }
    }
    checkOnboarding();
  }, [user]);

  useEffect(() => {
    // Wait for initialization and fonts
    if (initializing || !loaded) return;
    // If user is logged in, wait for onboarding status to be loaded
    if (user && hasCompletedOnboarding === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inEmailVerification = segments.join('/').includes('email-verification');
    const inOnboarding = segments[0] === 'detection-intro' || segments[0] === 'demo';

    if (user && user.emailVerified) {
      // User is logged in and verified
      if (inAuthGroup && !inEmailVerification) {
        // Redirect away from auth screens
        if (hasCompletedOnboarding) {
          router.replace('/(tabs)');
        } else {
          router.replace('/detection-intro');
        }
      } else if (!inOnboarding && !hasCompletedOnboarding && segments[0] === '(tabs)') {
        // User trying to access main app but hasn't completed onboarding
        router.replace('/detection-intro');
      }
    } else if (!user && !inAuthGroup) {
      // User is logged out but trying to access protected screens (including onboarding) - redirect to login
      router.replace('/(auth)/login');
    }
  }, [user, initializing, loaded, segments, hasCompletedOnboarding]);

  useEffect(() => {
    if (loaded && !initializing) {
      SplashScreen.hideAsync();
    }
  }, [loaded, initializing]);


  if (!loaded || initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/turtle-game" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/balloon-game" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/snake-game" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/tapping-game" options={{ headerShown: false }} />
        <Stack.Screen name="editprofile" options={{ headerShown: false }} />
        <Stack.Screen name="detection-intro" options={{ headerShown: false }} />
        <Stack.Screen name="demo" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}