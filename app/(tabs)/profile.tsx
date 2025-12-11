import { auth } from '@/config/firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('authUser');
    } catch (e) {
      console.warn('Failed to clear storage or sign out', e);
    } finally {
      router.replace('/(auth)/login');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileIcon}>
          <MaterialCommunityIcons
            name="account-circle"
            size={80}
            color="#1a73e8"
          />
        </View>
        <Text style={styles.profileName}>Child Profile</Text>
        <Text style={styles.profileEmail}>Manage account settings</Text>
      </View>

      <View style={styles.settingsContainer}>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Display Name</Text>
          <Text style={styles.settingValue}>Child Name</Text>
        </View>

        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Age</Text>
          <Text style={styles.settingValue}>8 years</Text>
        </View>

        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Speech Focus</Text>
          <Text style={styles.settingValue}>Stuttering, Word Repetition</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            // Handle edit profile
          }}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#1a73e8" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Account Settings</Text>
        <Text style={styles.infoText}>
          • Manage your profile information
        </Text>
        <Text style={styles.infoText}>
          • View and update speech focus areas
        </Text>
        <Text style={styles.infoText}>
          • Access parental controls
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  profileIcon: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  editButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
  },
  editButtonText: {
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#0369A1',
    marginBottom: 6,
    lineHeight: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
