import { Audio } from "expo-av";

let recording: Audio.Recording | null = null;

export async function startRecording() {
  try {
    // 1. Check if a recording object already exists to prevent "Only one Recording" error
    if (recording) {
      console.warn("A recording is already in progress. Stopping it first...");
      await stopRecording();
    }

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error("Microphone permission not granted");
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    // 2. Create and prepare the recording
    const recordingOptions = {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LinearPCM,
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
    // 3. Verify the recording is actually prepared/active before unloading
    const status = await recording.getStatusAsync();
    if (!status.canRecord) {
      console.warn("Recording is not in a state that can be stopped.");
      return null;
    }

    await recording.stopAndUnloadAsync();
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