import React from 'react';
import { Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';

// 1. Definition of variants
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => Promise<void> | void;
  variant?: ButtonVariant;
  className?: string; // For overriding styles
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode; 
}

// Spring configuration for the "squish" effect
const SPRING_CONFIG: WithSpringConfig = {
  damping: 15,
  stiffness: 300, 
  mass: 0.5, // Reduced mass for lighter, quicker feel
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  className = '',
  disabled = false,
  loading = false,
  icon,
}: ButtonProps) => {
  const scale = useSharedValue(1);

  // 2. Animated Style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // 3. Variant Styling Logic
  const getVariantStyles = (variant: ButtonVariant) => {
    switch (variant) {
      case 'primary':
        return 'bg-brand-primary active:bg-brand-secondary';
      case 'secondary':
        return 'bg-therapeutic-calm active:bg-teal-200';
      case 'danger':
        return 'bg-therapeutic-error active:bg-rose-200';
      case 'ghost':
        return 'bg-transparent active:bg-slate-100 dark:active:bg-slate-800';
      case 'outline':
        return 'bg-transparent border-[0.5px] border-brand-primary active:bg-teal-50 dark:border-teal-500 dark:active:bg-slate-800';
      default:
        return 'bg-brand-primary';
    }
  };

  const getTextColor = (variant: ButtonVariant) => {
    switch (variant) {
      case 'primary':
        return 'text-white';
      case 'secondary':
        return 'text-teal-900';
      case 'danger':
        return 'text-rose-900';
      case 'ghost':
        return 'text-slate-700 dark:text-slate-300';
      case 'outline':
        return 'text-brand-primary dark:text-teal-400';
      default:
        return 'text-white';
    }
  };

  const getSpinnerColor = (variant: ButtonVariant) => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return '#134E4A'; 
      case 'danger':
        return '#881337';
      case 'outline':
        return '#0D9488';
      default:
        return '#FFFFFF';
    }
  };

  // 4. Handlers
  const handlePressIn = () => {
    if (!disabled && !loading) scale.value = withSpring(0.95, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    if (!disabled && !loading) scale.value = withSpring(1, SPRING_CONFIG);
  };

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        className={`flex-row items-center justify-center rounded-2xl py-4 px-6 ${
          ['outline', 'ghost'].includes(variant) ? '' : 'shadow-sm'
        } ${getVariantStyles(
          variant
        )} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getSpinnerColor(variant)} />
        ) : (
          <>
            {icon && <Animated.View className="mr-2">{icon}</Animated.View>}
            <Text
              className={`font-semibold text-lg ${icon ? 'flex-1 text-center' : 'text-center'} ${getTextColor(
                variant
              )}`}
            >
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};
