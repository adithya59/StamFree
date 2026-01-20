import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { reload, sendEmailVerification } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, P } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';

export default function EmailVerificationScreen() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);

  useEffect(() => {
    // Check if already verified on mount
    const checkVerification = async () => {
      const user = auth.currentUser;
      if (user) {
        await reload(user);
        if (user.emailVerified) {
          router.replace('/(tabs)');
        }
      }
    };
    checkVerification();
  }, []);

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    setLoading(true);
    setResendDisabled(true);
    try {
      await sendEmailVerification(user);
      Alert.alert('Success', 'Verification email sent! Check your inbox.');
      
      // Re-enable resend after 60 seconds
      setTimeout(() => setResendDisabled(false), 60000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification email');
      setResendDisabled(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    setChecking(true);
    try {
      await reload(user);
      if (user.emailVerified) {
        Alert.alert('Success', 'Email verified! Redirecting...');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Not Verified', 'Please check your email and click the verification link.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check verification status');
    } finally {
      setChecking(false);
    }
  };

  return (
    <ScreenWrapper>
      <View className="flex-1 justify-center items-center px-6">
        <H1 className="text-center mb-4 text-brand-primary">Verify Your Email</H1>
        <P className="text-center mb-8 text-slate-600 dark:text-slate-300">
          We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </P>

        <Button
          title="I've Verified My Email"
          onPress={handleCheckVerification}
          loading={checking}
          disabled={checking}
          className="w-full mb-4"
        />

        <Button
          title={resendDisabled ? 'Wait 60s to Resend' : 'Resend Verification Email'}
          onPress={handleResendVerification}
          variant="outline"
          loading={loading}
          disabled={loading || resendDisabled}
          className="w-full mb-4"
        />

        <Button
          title="Back to Login"
          onPress={() => router.replace('/(auth)/login')}
          variant="ghost"
          className="mt-4"
        />
      </View>
    </ScreenWrapper>
  );
}
