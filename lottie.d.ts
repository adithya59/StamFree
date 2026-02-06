declare module 'lottie-react-native' {
  import { ViewProps } from 'react-native';
  import React from 'react';

  export interface LottieViewProps extends ViewProps {
    source: string | { uri: string } | any;
    autoPlay?: boolean;
    loop?: boolean;
    speed?: number;
    duration?: number;
    progress?: number;
    resizeMode?: 'cover' | 'contain' | 'center';
    style?: any;
    onAnimationFinish?: (isCancelled: boolean) => void;
  }

  export default class LottieView extends React.Component<LottieViewProps> {
    play(startFrame?: number, endFrame?: number): void;
    reset(): void;
    pause(): void;
    resume(): void;
  }
}
