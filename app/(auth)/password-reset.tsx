import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { type FirebaseError } from '@/types/shared';
import React, { useState } from 'react';
import { Alert, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, P } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function PasswordResetScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Success',
        'Password reset email sent! Check your inbox for instructions.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: unknown) {
      let errorMessage = 'Failed to send reset email';
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="mb-8">
            <H1 className="text-center mb-4 text-brand-primary">Reset Password</H1>
            <P className="text-center text-slate-600 dark:text-slate-300">
              Enter your email address and we'll send you instructions to reset your password.
            </P>
          </View>

          <View className="w-full">
            <Input
              label="Email"
              iconName="email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handlePasswordReset}
            />

            <Button
              title="Send Reset Email"
              onPress={handlePasswordReset}
              loading={loading}
              disabled={loading}
              className="w-full mt-4"
            />

            <Button
              title="Back to Login"
              onPress={() => router.back()}
              variant="ghost"
              className="mt-4"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
