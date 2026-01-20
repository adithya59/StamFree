import { auth } from '@/config/firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import '../global.css'; // Import NativeWind global styles
import 'react-native-reanimated'; // changed: must be the very first import

// Prevent the splash screen from only hiding when we are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    if (initializing || !loaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      // User is logged in but trying to access auth screens - redirect to home
      router.replace('/(tabs)');
    } else if (!user && !inAuthGroup) {
      // User is logged out but trying to access protected screens - redirect to login
      router.replace('/(auth)/login');
    }
  }, [user, initializing, loaded, segments]);

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
        <Stack.Screen name="exercises/breathing-exercises" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/onetap-game" options={{ headerShown: false }} />
        <Stack.Screen name="exercises/word-games" options={{ headerShown: false }} />
        <Stack.Screen name="editprofile" options={{ headerShown: false }} />
        <Stack.Screen name="demo" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} /> 
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}