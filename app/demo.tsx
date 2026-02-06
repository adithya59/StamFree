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
import { GameCard } from '@/components/ui/GameCard';

export default function Demo() {
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
      setResult(null);
      console.log('Starting recording..');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording.');
    }
  }

  // 3. Stop & Upload
  async function stopRecording() {
    setIsRecording(false);
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) {
      setLastUri(uri);
      uploadAudio(uri);
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
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = await response.json();
      console.log('Server Response:', data);
      setResult(data);
      setThinkingMessage(undefined);
    } catch (error) {
      setThinkingMessage('Couldn\'t reach the server. Check IP, then retry.');
      setAnalysisFailed(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', alignItems: 'center', paddingBottom: 40, paddingTop: 60 }}>
        <H1 className="text-center mb-6 text-brand-primary">Stutter Detection</H1>

        {/* STATUS INDICATOR */}
        <TouchableOpacity 
          onPress={pingBackend} 
          className="flex-row items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm mb-12 border border-slate-100 dark:border-slate-700"
        >
          <View className={`w-3 h-3 rounded-full mr-2 ${
            backendStatus === 'ok' ? 'bg-green-500' : 
            backendStatus === 'down' ? 'bg-red-500' : 'bg-slate-400'
          }`} />
          <Text className="text-slate-600 dark:text-slate-300 font-medium">
            Server: {backendStatus === 'ok' ? "Connected" : backendStatus === 'down' ? "Unreachable" : "Checking..."}
          </Text>
        </TouchableOpacity>

        {/* RECORD BUTTON */}
        <View className="mb-12 items-center justify-center">
            <View className={`p-1.5 rounded-full border-4 ${isRecording ? 'border-red-400/50' : uploading ? 'border-blue-400/50' : 'border-brand-primary/40'} bg-white/50 dark:bg-black/20 backdrop-blur-sm`}>
                <TouchableOpacity
                    className={`w-32 h-32 rounded-full justify-center items-center shadow-xl ${
                        uploading ? 'bg-blue-500' : isRecording ? 'bg-red-500' : 'bg-brand-primary'
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
            <P className="italic text-slate-700 dark:text-slate-300">
              "{result.transcript || "No speech detected"}"
            </P>

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

                {/* SCORES */}
                <View className="flex-row justify-between mt-2">
                  <View className="items-center flex-1">
                    <Label>Confidence</Label>
                    <H2 className="text-slate-800 dark:text-slate-100">{((result.stutter_score || 0) * 100).toFixed(0)}%</H2>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}