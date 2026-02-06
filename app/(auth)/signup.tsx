import { auth, db } from '@/config/firebaseConfig';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, H2, P, Label } from '@/components/ui/Typography';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
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

export default function CreateAccountScreen() {
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [speechIssues, setSpeechIssues] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const selectedAvatarImage = useMemo(() => {
    return profileAvatars.find(a => a.id === selectedAvatar)?.image;
  }, [selectedAvatar]);

  const speechIssueOptions = useMemo(
    () => [
      'Prolongation',
      'Blocks (silent pauses)',
      'Repetitions',
    ],
    []
  );

  const toggleSpeechIssue = (issue: string) => {
    setSpeechIssues((prev) => ({ ...prev, [issue]: !prev[issue] }));
  };

  const validateForm = () => {
    if (
      !childName ||
      !childAge ||
      !parentName ||
      !parentPhone ||
      !email ||
      !password
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(parentPhone.replace(/\D/g, ""))) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return false;
    }

    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    if (!selectedAvatar) {
      Alert.alert('Selection Required', 'Please choose a cute animal avatar for your child!');
      return;
    }
    setLoading(true);
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Update profile (display name)
      await updateProfile(user, { displayName: childName });

      // Store additional user data in Firestore
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore timeout")), 5000)
        );

        const selectedSpeechIssues = Object.entries(speechIssues)
          .filter(([, checked]) => checked)
          .map(([issue]) => issue);

        await Promise.race([
          setDoc(doc(db, "users", user.uid), {
            avatarId: selectedAvatar,
            childName,
            childAge,
            parentName,
            parentPhone,
            email,
            speechIssues: selectedSpeechIssues,
            createdAt: new Date().toISOString(),
            gameProgress: {
              turtle: { tier: 1, level: "word" },
              snake: { tier: 1, level: "word" },
              balloon: { tier: 1, level: "word" },
              onetap: { tier: 1, level: "word" },
            },
          }),
          timeoutPromise,
        ]);
      } catch (firestoreError) {
        console.warn("Firestore save failed or timed out:", firestoreError);
      }

      // Store auth state locally (legacy/backup)
      await AsyncStorage.setItem(
        "authUser",
        JSON.stringify({ email, uid: user.uid })
      );

      // Send email verification
      try {
        await sendEmailVerification(user);
        console.log("Verification email sent");
      } catch (verifyError) {
        console.warn("Failed to send verification email:", verifyError);
      }

      setShowSuccessModal(true);
    } catch (error: any) {
      let errorMessage = "Failed to create account. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessContinue = () => {
    setShowSuccessModal(false);
    router.replace("/(auth)/email-verification");
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
                <Ionicons name="person-add" size={48} color="#0D9488" />
             </View>
            <H1 className="text-center text-slate-800 dark:text-white text-4xl">Create Account</H1>
            <P className="text-center mt-3 text-slate-600 dark:text-slate-300 text-base px-4">
              Your journey to stammer-free speech starts here ✨
            </P>
          </View>

          <View className="bg-white/90 dark:bg-slate-900/90 rounded-[40px] px-8 pt-8 pb-10 shadow-2xl mb-6 border-2 border-white/50 dark:border-slate-800/50">
            {/* Child Details */}
            <H2 className="text-teal-600 dark:text-teal-400 mb-4">Child Details</H2>
            
            <Input
              label="Child's Name *"
              placeholder="Enter child's full name"
              value={childName}
              onChangeText={setChildName}
              editable={!loading}
              iconName="account"
            />
            
            <Input
              label="Child's Age *"
              placeholder="Enter child's age"
              value={childAge}
              onChangeText={setChildAge}
              keyboardType="number-pad"
              editable={!loading}
              iconName="numeric"
            />

            <View className="mb-6">
              <Label className="mb-3 text-slate-700 dark:text-slate-200">Child's Avatar *</Label>
              <TouchableOpacity 
                className="bg-white/90 dark:bg-slate-800/90 border-2 border-white/50 dark:border-slate-700/50 rounded-3xl p-6 items-center justify-center min-h-[140px] shadow-lg active:scale-[0.98]"
                onPress={() => setShowAvatarModal(true)}
                disabled={loading}
                activeOpacity={0.9}
              >
                {selectedAvatar ? (
                  <View className="items-center gap-2">
                    <Image source={selectedAvatarImage} className="w-20 h-20" resizeMode="contain" />
                    <Text className="text-teal-600 dark:text-teal-400 font-bold text-sm">Tap to Change</Text>
                  </View>
                ) : (
                  <View className="items-center gap-2">
                    <Ionicons name="happy-outline" size={40} color="#0D9488" />
                    <Text className="text-teal-600 dark:text-teal-400 font-semibold text-base text-center">Choose a friendly face</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Parent Details */}
            <H2 className="text-teal-600 dark:text-teal-400 mb-4 mt-2">Parent Details</H2>

            <Input
              label="Parent's Name *"
              placeholder="Enter parent's full name"
              value={parentName}
              onChangeText={setParentName}
              editable={!loading}
              iconName="account-tie"
            />

            <Input
              label="Parent's Phone Number *"
              placeholder="Enter 10-digit phone number"
              value={parentPhone}
              onChangeText={setParentPhone}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!loading}
              iconName="phone"
            />

            <H2 className="text-teal-600 dark:text-teal-400 mb-2 mt-4">Speech Challenges</H2>
            <P className="text-slate-500 dark:text-slate-400 mb-4 text-sm">Select any identified patterns to tailor practice (Optional).</P>
            
            <View className="flex-row flex-wrap gap-3 mb-6">
              {speechIssueOptions.map((issue) => {
                const checked = !!speechIssues[issue];
                return (
                  <TouchableOpacity
                    key={issue}
                    className={`flex-row items-center gap-2 border-2 rounded-full px-5 py-3 shadow-sm active:scale-95 ${
                      checked 
                        ? 'border-teal-600 bg-teal-500' 
                        : 'border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-800/90'
                    }`}
                    onPress={() => toggleSpeechIssue(issue)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                     <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                         checked ? 'bg-white border-white' : 'bg-white border-slate-300'
                     }`}>
                        {checked && <Ionicons name="checkmark" size={14} color="#0D9488" />}
                     </View>
                    <Text className={`text-sm font-bold ${
                        checked ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {issue}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Account Info */}
            <H2 className="text-teal-600 dark:text-teal-400 mb-4 mt-2">Account Info</H2>
            
            <Input
              label="Email Address *"
              placeholder="Enter email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              iconName="email"
            />

            <Input
              label="Password *"
              placeholder="Create password (min 6 chars)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              iconName="lock"
            />

            <Input
              label="Confirm Password *"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
              iconName="lock-check"
            />

            <Button
              title="Create Account"
              onPress={handleCreateAccount}
              loading={loading}
              disabled={loading}
              className="mt-6 mb-4"
            />

            <View className="flex-row justify-center pb-8">
              <Text className="text-slate-500 dark:text-slate-400">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity disabled={loading}>
                  <Text className="text-teal-600 dark:text-teal-400 font-bold">Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAvatarModal}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-5">
          <View className="bg-white dark:bg-slate-800 rounded-[32px] p-8 items-center w-full max-w-sm shadow-2xl border-2 border-white/50 dark:border-slate-700/50">
            <H2 className="text-slate-800 dark:text-white text-2xl mb-2">Pick an Avatar</H2>
            <P className="text-center mb-6 text-slate-500 dark:text-slate-400">Choose a friendly face for your adventure!</P>
            
            <View className="flex-row flex-wrap gap-4 justify-center mb-6">
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
                title="Cancel" 
                variant="ghost" 
                onPress={() => setShowAvatarModal(false)} 
                className="w-full"
            />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={handleSuccessContinue}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-5">
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-8 items-center w-full max-w-sm shadow-xl">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
               <Text className="text-3xl">🎉</Text>
            </View>
            <H2 className="text-center mb-2">Success!</H2>
            <P className="text-center mb-6 text-slate-500">
              Your account has been created successfully. Welcome to StamFree!
            </P>
            <Button
              title="Go to Dashboard"
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/(tabs)");
              }}
              className="w-full"
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
