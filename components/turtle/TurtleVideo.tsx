import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

export interface TurtleVideoProps {
  /** The current step in the session (0 to totalSteps) */
  currentStep: number;
  /** Total number of segments in the video/session */
  totalSteps?: number;
  /** Duration of the video in milliseconds (defaults to 13000ms per spec) */
  videoDuration?: number;
  /** NEW: 0, 1, or 2 for journey selection */
  journeyIndex: number;
  /** Callback when a segment finishes playing */
  onSegmentComplete?: () => void;
  style?: any; // Allow custom styles
}

// Mapping of journeyIndex to video sources
const VIDEO_SOURCES = [
  require('../../assets/videos/turtle1.mp4'),
  require('../../assets/videos/turtle2.mp4'),
  require('../../assets/videos/turtle3.mp4'),
];

export const TurtleVideo: React.FC<TurtleVideoProps> = ({ 
  currentStep, 
  totalSteps = 4,
  videoDuration = 13000, // Hardcoded to 13 seconds per TURTLE_GAME_SPEC.md
  journeyIndex, // NEW: Add journeyIndex to props
  onSegmentComplete,
  style
}) => {
  const videoRef = useRef<Video>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const isPlayingRef = useRef(false);

  // Calculate segment duration based on hardcoded total duration
  const SEGMENT_DURATION = videoDuration / totalSteps; // 3250ms for 4 segments

  // Load state tracking
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && !isLoaded) {
      setIsLoaded(true);
      console.log(`[TurtleVideo] Video loaded. Duration: ${videoDuration}ms, Segment: ${SEGMENT_DURATION}ms`);
    }
  };

  useEffect(() => {
    if (currentStep > 0 && isLoaded && videoRef.current) {
      const startTime = (currentStep - 1) * SEGMENT_DURATION;
      const endTime = currentStep * SEGMENT_DURATION;

      console.log(`[TurtleVideo] Playing segment ${currentStep}/${totalSteps}: ${startTime}ms to ${endTime}ms`);
      
      isPlayingRef.current = true;
      videoRef.current.playFromPositionAsync(startTime).then(() => {
        // Auto-pause after segment duration
        setTimeout(() => {
          videoRef.current?.pauseAsync();
          isPlayingRef.current = false;
          onSegmentComplete?.();
          console.log(`[TurtleVideo] Segment ${currentStep} complete`);
        }, SEGMENT_DURATION);
      });
    }
  }, [currentStep, isLoaded]);

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={VIDEO_SOURCES[journeyIndex] || VIDEO_SOURCES[0]}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER} // Changed to COVER to remove black bars
        shouldPlay={false}
        isMuted={true}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Removed absoluteFillObject allowing parent to control layout
    backgroundColor: '#000',
    overflow: 'hidden', // Ensure video doesn't bleed out
  },
});

