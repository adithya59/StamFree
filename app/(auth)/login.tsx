import { auth } from '@/config/firebaseConfig';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, P } from '@/components/ui/Typography';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email address before logging in.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to Verification', onPress: () => router.replace('/(auth)/email-verification') },
          ]
        );
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem(
        'authUser',
        JSON.stringify({ email: user.email, uid: user.uid })
      );

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper className="pt-0">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="pt-12 pb-8 items-center">
             <View 
               className="bg-teal-500/10 rounded-full items-center justify-center mb-6"
               style={{ width: 96, height: 96, borderRadius: 48 }}
             >
                <Ionicons name="sparkles" size={48} color="#0D9488" />
             </View>
            <H1 className="text-center text-slate-800 dark:text-white text-4xl">StamFree</H1>
            <P className="text-center mt-3 text-slate-600 dark:text-slate-300 text-base">Welcome back! 👋</P>
          </View>

          <View className="bg-white/90 dark:bg-slate-900/90 rounded-[40px] px-8 pt-8 pb-10 shadow-2xl mb-6 border-2 border-white/50 dark:border-slate-800/50">
            <Input
              label="Email"
              iconName="email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <Input
              label="Password"
              iconName="lock"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity
              className="items-end mt-2 mb-6"
              onPress={() => router.push('/(auth)/password-reset')}
            >
              <Text className="text-teal-600 dark:text-teal-400 font-bold text-sm">Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title="Login"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              className="w-full"
            />

            <View className="flex-row justify-center mt-6">
              <Text className="text-slate-500 dark:text-slate-400">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text className="text-teal-600 dark:text-teal-400 font-bold">Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
