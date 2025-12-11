import { useAudioRecording } from '@/hooks/useAudioRecording';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type AudioRecorderProps = {
  onRecorded?: (uri: string, durationMs: number) => void;
};

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecorded }) => {
  const { status, uri, durationMs, startRecording, stopRecording, play, reset } = useAudioRecording();

  const handleRecordPress = async () => {
    if (status === 'recording') {
      const resultUri = await stopRecording();
      if (resultUri && onRecorded) {
        onRecorded(resultUri, durationMs);
      }
    } else {
      await reset();
      await startRecording();
    }
  };

  const seconds = Math.floor(durationMs / 1000)
    .toString()
    .padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>00:{seconds}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, status === 'recording' ? styles.stopButton : styles.recordButton]}
          onPress={handleRecordPress}
        >
          <Text style={styles.buttonText}>{status === 'recording' ? 'Stop' : 'Record'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !uri && styles.disabledButton]}
          disabled={!uri}
          onPress={play}
        >
          <Text style={styles.buttonText}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !uri && styles.disabledButton]}
          disabled={!uri}
          onPress={reset}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.status}>Status: {status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timer: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  recordButton: {
    backgroundColor: '#DC2626',
  },
  stopButton: {
    backgroundColor: '#F59E0B',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  status: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
  },
});
