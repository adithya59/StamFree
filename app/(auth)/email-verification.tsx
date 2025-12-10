import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { reload, sendEmailVerification } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.description}>
          We&apos;ve sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </Text>

        <TouchableOpacity
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={handleCheckVerification}
          disabled={checking}>
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>I&apos;ve Verified My Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonSecondary, (loading || resendDisabled) && styles.buttonDisabled]}
          onPress={handleResendVerification}
          disabled={loading || resendDisabled}>
          {loading ? (
            <ActivityIndicator color="#007AFF" />
          ) : (
            <Text style={styles.buttonSecondaryText}>
              {resendDisabled ? 'Wait 60s to Resend' : 'Resend Verification Email'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  buttonSecondaryText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
