import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ThinkingOverlay from '../components/ui/ThinkingOverlay';
import { getAnalyzeAudioUrl, getHealthUrl } from '../config/backend';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { H1, H2, Label, P } from '@/components/ui/Typography';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const STORY_TEXT = "The Quick Adventure\n\nThe quick brown fox jumps over a lazy dog near the quiet zoo. Zoe and Jack bring five bright yellow balloons and a blue backpack. “This thin path is very rocky,” Jack says. They walk through thick grass and splash in the fresh water. Suddenly, strong winds blow, and the branches shake. Zoe shouts, “Wait for me!” and waves her hand. After the exciting journey, they relax and enjoy warm vanilla juice.";

const ISSUE_REDIRECTS: Record<string, string> = {
  'blocking': '/exercises/balloon-game',
  'prolongation': '/exercises/turtle-game',
  'repetition': '/exercises/tapping-game',
  'block': '/exercises/balloon-game',
};





export default function Demo() {
  const router = useRouter();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'ok' | 'down'>('unknown');
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string | undefined>(undefined);



  // 1. Permissions & Health Check on Mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone access.');
      }
    })();
    pingBackend();
  }, []);

  // Health Check
  async function pingBackend() {
    setBackendStatus('unknown');
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
      const fetchRequest = fetch(getHealthUrl(), { method: 'GET' });
      await Promise.race([fetchRequest, timeout]);
      setBackendStatus('ok');
    } catch (e) {
      console.log("Backend check failed:", e);
      setBackendStatus('down');
    }
  }

  // 2. Start Recording
  async function startRecording() {
    try {
      if (isRecording || uploading) return;

      // Clean up any previous recording object to avoid "Only one Recording object can be prepared"
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          // ignore if already stopped
        }
        setRecording(null);
      }

      setResult(null);

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.log("Recording error:", err);
      setIsRecording(false);
    }
  }

  // 3. Stop & Upload
  async function stopRecording() {
    if (!isRecording) return;
    setIsRecording(false);

    if (!recording) return;

    try {
      const status = await recording.getStatusAsync();
      if (status.canRecord) {
        await recording.stopAndUnloadAsync();
      }

      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        setLastUri(uri);
        uploadAudio(uri);
      }
    } catch (error) {
      console.log("Stop recording error:", error);
      setRecording(null);
    }
  }


  // 4. Upload Logic
  async function uploadAudio(uri: string) {
    setUploading(true);
    setAnalysisFailed(false);
    try {
      const formData = new FormData();
      const fileType = uri.split('.').pop() || 'm4a';

      formData.append('file', {
        uri,
        name: `recording.${fileType}`,
        type: `audio/${fileType}`,
      } as any);

      const response = await fetch(getAnalyzeAudioUrl(), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Server Error:', response.status, errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Server Response:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      setThinkingMessage(undefined);

      // 🔥 PERSONALIZATION LOGIC
      if (data.is_stutter && data.type) {
        let detectedType = data.type.toLowerCase();

        if (detectedType === 'block') {
          detectedType = 'blocking';
        }
        await AsyncStorage.setItem('stutterType', detectedType);
      }
    } catch (error) {
      setThinkingMessage('Couldn\'t reach the server. Check IP, then retry.');
      setAnalysisFailed(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScreenWrapper>
      <View className="absolute top-14 left-6 z-10">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-full shadow-sm"
        >
          <Ionicons name="arrow-back" size={24} color="#0D9488" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 40, paddingTop: 60 }}>
        <H1 className="text-center mb-6 text-brand-primary">Stutter Detection</H1>

        {/* STATUS INDICATOR */}
        <TouchableOpacity
          onPress={pingBackend}
          className="flex-row items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm mb-12 border border-slate-100 dark:border-slate-700"
        >
          <View className={`w-3 h-3 rounded-full mr-2 ${backendStatus === 'ok' ? 'bg-green-500' :
            backendStatus === 'down' ? 'bg-red-500' : 'bg-slate-400'
            }`} />
          <Text className="text-slate-600 dark:text-slate-300 font-medium">
            Server: {backendStatus === 'ok' ? "Connected" : backendStatus === 'down' ? "Unreachable" : "Checking..."}
          </Text>
        </TouchableOpacity>

        {/* STORY PROMPT SECTION */}
        <View className="w-full px-6 mb-8">
          <View className="bg-brand-primary/5 dark:bg-brand-primary/10 rounded-3xl p-6 border border-brand-primary/10">
            <Text className="text-brand-primary font-bold tracking-widest uppercase text-xs mb-4">Reading Adventure</Text>

            <ScrollView className="max-h-60" showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-bold leading-relaxed text-slate-800 dark:text-slate-100 text-center">
                {STORY_TEXT}
              </Text>
            </ScrollView>

            <View className="mt-4 items-center">
              <Text className="text-slate-500 dark:text-slate-400 text-xs italic">Read the whole paragraph clearly</Text>
            </View>
          </View>
        </View>


        {/* RECORD BUTTON */}

        <View className="mb-12 items-center justify-center">
          <View className={`p-1.5 rounded-full border-4 ${isRecording ? 'border-red-400/50' : uploading ? 'border-blue-400/50' : 'border-brand-primary/40'} bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
            <TouchableOpacity
              className={`w-32 h-32 rounded-full justify-center items-center shadow-xl ${uploading ? 'bg-blue-500' : isRecording ? 'bg-red-500' : 'bg-brand-primary'
                }`}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={uploading}
              activeOpacity={0.9}
            >
              {uploading ? (
                <ActivityIndicator color="white" size="large" />
              ) : (
                <Ionicons
                  name="mic"
                  size={48}
                  color="white"
                />
              )}
              <Text className="text-white font-extrabold text-xs mt-2 tracking-widest opacity-90 uppercase">
                {uploading ? '...' : isRecording ? 'RELEASE' : 'HOLD'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ThinkingOverlay
          visible={uploading || analysisFailed}
          title={analysisFailed ? 'Network issue' : 'Thinking...'}
          message={analysisFailed ? (thinkingMessage || 'Please check connection and try again.') : 'Analyzing your speech. This takes a few seconds.'}
          blocking={!analysisFailed}
          onCancel={analysisFailed ? () => setAnalysisFailed(false) : undefined}
          onRetry={analysisFailed && lastUri ? () => { setAnalysisFailed(false); uploadAudio(lastUri); } : undefined}
        />

        {/* RESULTS SECTION */}
        {result && (
          <View className="w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">

            {/* 1. MAIN RESULT */}
            <Label className="text-center mb-2 uppercase tracking-widest text-slate-400">Analysis Result</Label>
            <H2 className={`text-center mb-6 ${result.is_stutter ? 'text-red-500' : 'text-green-500'}`}>
              {result.is_stutter ? `⚠️ ${result.type} detected` : '✅ Fluent speech'}
            </H2>

            {/* 2. TRANSCRIPT */}
            <View className="h-[1px] bg-slate-100 dark:bg-slate-700 my-4 w-full" />
            <Label className="mb-2">Transcript:</Label>
            <View className="flex-row flex-wrap">
              {(result.transcript || "").split(' ').map((word: string, index: number) => {
                const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
                const cleanProblem = (result.problem_word || "").toLowerCase();
                const isProblem = cleanWord === cleanProblem && result.is_stutter;

                return (
                  <Text
                    key={index}
                    className={`${isProblem ? 'text-red-600 font-black bg-red-50 dark:bg-red-900/30 px-1 rounded' : 'text-slate-700 dark:text-slate-300'} text-lg italic`}
                  >
                    {word}{' '}
                  </Text>
                );
              })}
              {!result.transcript && (
                <P className="italic text-slate-400">No speech detected</P>
              )}
            </View>


            {/* 3. DETAILS (If Stutter) */}
            {result.is_stutter && (
              <View className="mt-4">

                {/* PHONEME BADGE */}
                {result.problem_phoneme && (
                  <View className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl items-center my-4 border border-red-500 border-dashed">
                    <Text className="text-red-500 font-bold mb-1">Trouble Sound</Text>
                    <Text className="text-4xl font-extrabold text-red-500">/{result.problem_phoneme}/</Text>
                  </View>
                )}

                {/* SCORES BREAKDOWN */}
                {result.all_scores && (
                  <View className="mt-6 space-y-4">
                    <Label className="mb-2 text-slate-400 text-xs uppercase tracking-widest">Issue Breakdown</Label>
                    {Object.entries(result.all_scores).map(([type, score]: [string, any]) => (
                      <View key={type} className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl mb-2">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-slate-700 dark:text-slate-300 font-bold capitalize">{type}</Text>
                          <Text className="text-slate-500 text-xs">{(score * 100).toFixed(0)}%</Text>
                        </View>
                        <View className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <View
                            className={`h-full ${type === result.type ? 'bg-red-500' : 'bg-brand-primary/40'}`}
                            style={{ width: `${score * 100}%` }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {!result.all_scores && (
                  <View className="flex-row justify-between mt-2">
                    <View className="items-center flex-1">
                      <Label>Confidence</Label>
                      <H2 className="text-slate-800 dark:text-slate-100">{((result.stutter_score || 0) * 100).toFixed(0)}%</H2>
                    </View>
                  </View>
                )}


                {result?.is_stutter && (
                  <TouchableOpacity
                    className="mt-6 bg-brand-primary py-4 rounded-2xl items-center shadow-lg shadow-brand-primary/30"
                    onPress={() => {
                      router.replace('/(tabs)');
                    }}
                  >
                    <Text className="text-white font-extrabold text-lg">
                      Start My {result.type} Journey
                    </Text>
                    <Text className="text-white/70 text-xs font-medium uppercase tracking-tighter">See exercises for {result.type}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!result.is_stutter && (
              <TouchableOpacity
                className="mt-6 bg-green-600 py-4 rounded-2xl items-center shadow-lg shadow-green-600/30"
                onPress={() => router.replace('/(tabs)')}
              >
                <Text className="text-white font-extrabold text-lg">
                  Continue to Journey
                </Text>
              </TouchableOpacity>
            )}

          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}