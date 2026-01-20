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
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, Label } from '@/components/ui/Typography';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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

// ... imports
// ... imports

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // New state

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
    // ... loading view
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6 px-1">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-11 h-11 items-center justify-center bg-white/60 border border-white rounded-full shadow-sm"
          >
            <Ionicons name="arrow-back" size={24} color="#166534" />
          </TouchableOpacity>
          <H1 className="text-slate-800 dark:text-white">Edit Profile</H1>
          <View className="w-11" />
        </View>

        {/* Inputs */}
        <Input
          label="Child Name"
          placeholder="Enter name"
          value={childName}
          onChangeText={setChildName}
          iconName="account"
        />

        <Input
          label="Age"
          placeholder="Enter age"
          value={childAge}
          onChangeText={setChildAge}
          keyboardType="number-pad"
          iconName="calendar"
        />

        {/* Avatar Picker Card */}
        <View className="mb-6">
          <Label className="mb-3 text-slate-700 dark:text-slate-200">Avatar</Label>
          <TouchableOpacity 
            className="bg-white/90 dark:bg-slate-800/90 border-2 border-white/50 dark:border-slate-700/50 rounded-3xl p-6 items-center justify-center min-h-[120px] shadow-lg active:scale-[0.98]"
            onPress={() => setShowAvatarModal(true)}
            activeOpacity={0.9}
          >
            {selectedAvatar ? (
              <View className="items-center">
                <Image source={selectedAvatarImage} className="w-16 h-16 mb-3" resizeMode="contain" />
                <Text className="text-teal-600 dark:text-teal-400 font-bold text-sm">Tap to Change</Text>
              </View>
            ) : (
              <View className="items-center">
                <Ionicons name="happy-outline" size={40} color="#0D9488" className="mb-3" />
                <Text className="text-slate-500 dark:text-slate-400 font-semibold">Choose a friendly face</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Speech Challenges */}
        <View className="mb-8">
          <Label className="mb-3 text-slate-700 dark:text-slate-200">Speech Challenges</Label>
          <View className="flex-row flex-wrap gap-3">
            {speechOptions.map((item) => {
              const isSelected = speechIssues.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  className={`px-5 py-3 rounded-full border-2 shadow-sm active:scale-95 ${
                    isSelected 
                      ? 'bg-teal-500 border-teal-600' 
                      : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
                  }`}
                  onPress={() =>
                    setSpeechIssues((prev) =>
                      prev.includes(item)
                        ? prev.filter((i) => i !== item)
                        : [...prev, item]
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    className={`font-bold text-sm ${
                      isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button title="Save Changes" onPress={handleSave} />
      </ScrollView>

      {/* Avatar Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAvatarModal}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-6">
          <View className="bg-white dark:bg-slate-800 rounded-[32px] p-8 w-full max-w-sm items-center shadow-2xl border-2 border-white/50 dark:border-slate-700/50">
            <H1 className="text-center mb-6 text-slate-800 dark:text-white text-2xl">Pick an Avatar</H1>
            <View className="flex-row flex-wrap gap-4 justify-center mb-8">
              {profileAvatars.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <TouchableOpacity
                    key={avatar.id}
                    className={`w-20 h-20 rounded-2xl border-3 items-center justify-center shadow-md active:scale-95 ${
                      isSelected 
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30' 
                        : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'
                    }`}
                    onPress={() => {
                      setSelectedAvatar(avatar.id);
                      setShowAvatarModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Image source={avatar.image} className="w-16 h-16" resizeMode="contain" />
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button 
              title="Close" 
              variant="secondary" 
              onPress={() => setShowAvatarModal(false)}
              className="w-full" 
            />
          </View>
        </View>
      </Modal>

      {/* Success Modal removed */}
    </ScreenWrapper>
  );
}
