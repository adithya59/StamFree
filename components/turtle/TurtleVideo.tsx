import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

export interface TurtleVideoProps {
  /** The current step in the session (0 to totalSteps) */
  currentStep: number;
  /** Total number of segments in the video/session */
  totalSteps?: number;
  /** Callback when a segment finishes playing */
  onSegmentComplete?: () => void;
}

export const TurtleVideo: React.FC<TurtleVideoProps> = ({ 
  currentStep, 
  totalSteps = 4,
  onSegmentComplete
}) => {
  const videoRef = useRef<Video>(null);
  const [duration, setDuration] = useState<number>(0);
  const isPlayingRef = useRef(false);

  // Load duration once the video is ready
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.durationMillis) {
      setDuration(status.durationMillis);
    }
  };

  useEffect(() => {
    if (currentStep > 0 && duration > 0 && videoRef.current) {
      const segmentDuration = duration / totalSteps;
      const startTime = (currentStep - 1) * segmentDuration;
      const endTime = currentStep * segmentDuration;

      console.log(`[TurtleVideo] Playing segment ${currentStep}: ${startTime}ms to ${endTime}ms`);
      
      isPlayingRef.current = true;
      videoRef.current.playFromPositionAsync(startTime).then(() => {
        // Stop logic: Check position or use timeout
        // Timeout is more reliable for background segments
        setTimeout(() => {
          videoRef.current?.pauseAsync();
          isPlayingRef.current = false;
          onSegmentComplete?.();
        }, segmentDuration);
      });
    }
  }, [currentStep, duration]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require('../../assets/images/turtle1.mp4')}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isMuted={true}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});
