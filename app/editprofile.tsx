import { auth, db } from '@/config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const profileAvatars = [
  { id: 'bear', image: require('@/assets/profilepictures/bear.png') },
  { id: 'crab', image: require('@/assets/profilepictures/crab.png') },
  { id: 'dog', image: require('@/assets/profilepictures/dog.png') },
  { id: 'giraffe', image: require('@/assets/profilepictures/giraffe.png') },
  { id: 'hippo', image: require('@/assets/profilepictures/hippo.png') },
  { id: 'lion', image: require('@/assets/profilepictures/lion.png') },
  { id: 'rabbit', image: require('@/assets/profilepictures/rabbit.png') },
  { id: 'tiger', image: require('@/assets/profilepictures/tiger.png') },
];

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [speechIssues, setSpeechIssues] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const speechOptions = ['Prolongation', 'Blocks (silent pauses)', 'Repetitions'];

  const selectedAvatarImage = useMemo(() => {
    return profileAvatars.find(a => a.id === selectedAvatar)?.image;
  }, [selectedAvatar]);

  // 🔹 Fetch existing data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          const data = snap.data();
          setChildName(data.childName || '');
          setChildAge(String(data.childAge || ''));
          setSpeechIssues(data.speechIssues || []);
          setSelectedAvatar(data.avatarId || null);
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 🔹 Save updated data
  const handleSave = async () => {
    if (!childName || !childAge) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, 'users', user.uid), {
        childName,
        childAge: Number(childAge),
        speechIssues,
        avatarId: selectedAvatar,
      });

      Alert.alert('Success', 'Profile updated successfully');
      router.replace('/(tabs)/profile');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1a73e8" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 150 }} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Child Name</Text>
          <TextInput
            style={styles.input}
            value={childName}
            onChangeText={setChildName}
            placeholder="Enter name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={childAge}
            onChangeText={setChildAge}
            keyboardType="number-pad"
            placeholder="Enter age"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Avatar</Text>
          <TouchableOpacity 
            style={styles.avatarPickerTrigger}
            onPress={() => setShowAvatarModal(true)}
          >
            {selectedAvatar ? (
              <View style={styles.selectedAvatarPreview}>
                <Image source={selectedAvatarImage} style={styles.avatarPreviewImage} />
                <Text style={styles.changeAvatarText}>Change Avatar</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="happy-outline" size={32} color="#1a73e8" />
                <Text style={styles.avatarPlaceholderText}>Choose a friendly face</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Speech Challenges</Text>
          <View style={styles.chipContainer}>
            {speechOptions.map((item) => {
              const isSelected = speechIssues.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                  onPress={() =>
                    setSpeechIssues((prev) =>
                      prev.includes(item)
                        ? prev.filter((i) => i !== item)
                        : [...prev, item]
                    )
                  }
                >
                  <Text
                    style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAvatarModal}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.avatarModalContent]}>
            <Text style={styles.modalTitle}>Pick an Avatar</Text>
            <View style={styles.avatarGrid}>
              {profileAvatars.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <TouchableOpacity
                    key={avatar.id}
                    style={[
                      styles.avatarItem,
                      isSelected && styles.avatarSelected,
                    ]}
                    onPress={() => {
                      setSelectedAvatar(avatar.id);
                      setShowAvatarModal(false);
                    }}
                  >
                    <Image source={avatar.image} style={styles.avatarImage} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a73e8',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
    color: '#111827',
    fontSize: 16,
  },
  avatarPickerTrigger: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  selectedAvatarPreview: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPreviewImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  changeAvatarText: {
    color: '#1a73e8',
    fontWeight: '600',
    fontSize: 14,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPlaceholderText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1a73e8',
  },
  chipText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  avatarModalContent: {
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1F2937',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarItem: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  avatarSelected: {
    borderColor: '#1a73e8',
    backgroundColor: '#EFF6FF',
  },
  avatarImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#4B5563',
    fontWeight: '600',
  },
});


