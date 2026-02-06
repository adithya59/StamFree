import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Image, ImageSourcePropType } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface GameCardProps {
  title: string;
  description?: string;
  iconSource?: ImageSourcePropType;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  lottieSource?: any;
  gradientColors?: [string, string, ...string[]];
  darkGradientColors?: [string, string, ...string[]];
  onPress: () => void;
  className?: string;
  delay?: number;
}

export const GameCard = ({
  title,
  description,
  iconSource,
  iconName,
  lottieSource,
  gradientColors = ['#ffffff', '#f8fafc'],
  darkGradientColors, // Optional dark mode override
  onPress,
  className = '',
  delay = 0,
}: GameCardProps) => {
  const lottieRef = useRef<LottieView>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (lottieSource) {
      setTimeout(() => {
        lottieRef.current?.play();
      }, delay + 300);
    }
  }, [lottieSource, delay]);

  // Select gradient based on theme
  const activeColors = (colorScheme === 'dark' && darkGradientColors) 
    ? darkGradientColors 
    : gradientColors;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ flex: 1 }}>
      <Pressable
        onPress={onPress}
        className={`relative overflow-hidden rounded-3xl m-1 shadow-md active:opacity-95 ${className}`}
        style={{ flex: 1 }}
      >
        <LinearGradient
            colors={activeColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="flex-1 p-5 justify-between"
        >
          {/* Header / Text Content */}
          <View className="flex-row justify-between items-start">
             <View className="flex-1 mr-2">
                <Text className="text-xl font-bold text-white mb-1 shadow-sm">
                    {title}
                </Text>
                {description && (
                    <Text className="text-sm text-white/90 font-medium leading-5">
                        {description}
                    </Text>
                )}
             </View>
             
             {/* Icon / Lottie Container */}
             <View>
                {lottieSource ? (
                    <View className="h-16 w-16" pointerEvents="none">
                        <LottieView
                        ref={lottieRef}
                        source={lottieSource}
                        style={{ width: 64, height: 64 }}
                        autoPlay={true}
                        loop={true}
                        resizeMode="contain"
                        />
                    </View>
                ) : iconSource ? (
                    <Image 
                        source={iconSource}
                        className="h-12 w-12"
                        resizeMode="contain"
                    />
                ) : iconName ? (
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-white/30 backdrop-blur-md border border-white/20">
                        <MaterialCommunityIcons name={iconName} size={28} color="#FFFFFF" />
                    </View>
                ) : null}
             </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};
