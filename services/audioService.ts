// services/audioService.ts
import { Audio } from 'expo-av';

export async function startRecording(): Promise<Audio.Recording> {
  try {
    // Request microphone permissions if not already granted
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Microphone permission not granted');
    }

    // Configure audio session for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true, // Ensures recording works even when the device is on silent
      shouldDuckAndroid: true,
      interruptionModeIOS: 1, // Stay active
      interruptionModeAndroid: 1, // Stay active
    });

    // Create and prepare the recording
    const newRecording = new Audio.Recording();
    await newRecording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    // Start recording
    await newRecording.startAsync();

    console.log('Recording started!');
    return newRecording;
  } catch (error) {
    console.error('Failed to start recording', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function stopRecording(
  recording: Audio.Recording
): Promise<string | null> {
  if (!recording) {
    console.warn('No recording object provided to stopRecording.');
    return null;
  }

  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    return uri;
  } catch (error) {
    console.error('Failed to stop recording', error);
    // Even if it fails to stop, try to unload to free up resources
    await recording.unloadAsync().catch(() => {});
    return null;
  }
}
// ... keep your existing startRecording and stopRecording code ...

export async function uploadTurtleAudio(uri: string) {
  const formData = new FormData();
  
  // Create the file object for the request
  const fileToUpload = {
    uri: uri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  };

  // @ts-ignore
  formData.append('file', fileToUpload);

  try {
    const response = await fetch('http://172.20.10.5:5000/analyze/turtle', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Upload Error:", error);
    return null;
  }
}

// services/audioService.ts


