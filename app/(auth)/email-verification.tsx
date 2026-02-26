import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { reload, sendEmailVerification } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, P } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function EmailVerificationScreen() {
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const hasUser = !!auth.currentUser;

  useEffect(() => {
    // If user is logged in and already verified, redirect to dashboard
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
      Alert.alert('Info', 'Please login first to resend verification email.');
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

  return (
    <ScreenWrapper>
      <View className="flex-1 justify-center items-center px-6">
        {/* Email Icon */}
        <View className="w-24 h-24 bg-teal-100 dark:bg-teal-900/30 rounded-full items-center justify-center mb-6">
          <Ionicons name="mail-outline" size={48} color="#0D9488" />
        </View>

        <H1 className="text-center mb-4 text-teal-600 dark:text-teal-400">Check Your Email</H1>
        
        <P className="text-center mb-2 text-slate-600 dark:text-slate-300 text-lg">
          We've sent a verification link to your email address.
        </P>
        
        <P className="text-center mb-8 text-slate-500 dark:text-slate-400">
          Please click the link in the email to verify your account, then come back and login.
        </P>

        <Button
          title="Go to Login"
          onPress={() => router.replace('/(auth)/login')}
          className="w-full mb-4"
        />

        {hasUser && (
          <Button
            title={resendDisabled ? 'Wait 60s to Resend' : 'Resend Verification Email'}
            onPress={handleResendVerification}
            variant="outline"
            loading={loading}
            disabled={loading || resendDisabled}
            className="w-full"
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
