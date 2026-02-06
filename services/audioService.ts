import { Audio } from "expo-av";

let recording: Audio.Recording | null = null;
let isPreparing = false; // Prevent concurrent prepare/create
let recordingStartTime: number | null = null; // Track when recording started

export async function startRecording() {
  try {
    // Block concurrent calls while preparing/creating
    if (isPreparing) {
      console.warn("Recording is already preparing. Ignoring duplicate start.");
      return;
    }
    isPreparing = true;

    // 1. Force cleanup of any existing recording
    if (recording) {
      console.warn("Found existing recording. Stopping it...");
      try {
        await recording.stopAndUnloadAsync();
      } catch (cleanupError) {
        // Ignore cleanup errors (recording might be already unloaded)
      }
      recording = null;
    }

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error("Microphone permission not granted");
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // 2. Configure recording options for minimal latency (16kHz to match AI model)
    const recordingOptions = {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000, // Match server model (no resampling)
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };

    const { recording: newRecording } = await Audio.Recording.createAsync(
      recordingOptions
    );
    
    recording = newRecording;
    recordingStartTime = Date.now(); // Track start time for duration calculation
    console.log("Recording started at:", recordingStartTime);
  } catch (error) {
    console.error("Failed to start recording:", error);
    recording = null; // Reset on failure
    recordingStartTime = null;
  } finally {
    isPreparing = false;
  }
}

export interface RecordingResult {
  uri: string;
  duration: number; // Duration in milliseconds
}

export async function stopRecording(): Promise<RecordingResult | null> {
  if (!recording) {
    console.log("No active recording to stop.");
    return null;
  }

  try {
    const status = await recording.getStatusAsync();
    // Only stop if it's recording or prepared
    if (status.isRecording || status.canRecord) {
        await recording.stopAndUnloadAsync();
    }
    const uri = recording.getURI();
    
    // Calculate duration
    const duration = recordingStartTime ? Date.now() - recordingStartTime : 0;
    
    console.log("Recording stopped, URI:", uri, "Duration:", duration, "ms");
    
    recording = null; // Clear the object for the next session
    recordingStartTime = null;
    
    return uri ? { uri, duration } : null;
  } catch (error) {
    console.error("Failed to stop recording:", error);
    recording = null; // Ensure cleanup even on error
    recordingStartTime = null;
    return null;
  }
}