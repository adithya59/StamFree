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
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
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