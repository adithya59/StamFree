import { Audio } from "expo-av";

let recording: Audio.Recording | null = null;

export async function startRecording() {
  try {
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
        outputFormat: Audio.IOSOutputFormat.LinearPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000, // Match server model
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
    console.log("Recording started");
  } catch (error) {
    console.error("Failed to start recording:", error);
    recording = null; // Reset on failure
  }
}

export async function stopRecording(): Promise<string | null> {
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
    console.log("Recording stopped, URI:", uri);
    
    recording = null; // Clear the object for the next session
    return uri;
  } catch (error) {
    console.error("Failed to stop recording:", error);
    recording = null; // Ensure cleanup even on error
    return null;
  }
}