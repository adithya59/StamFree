import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* 
 * AnimatedTabBar
 * A custom tab bar with a sleek "floating pill" design and a sliding active indicator.
 * It uses react-native-reanimated for 60fps animations on the UI thread.
 */

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const screenWidth = Dimensions.get('window').width;
  // Calculate tab width based on number of tabs and horizontal padding
  const totalHorizontalPadding = 32; // 16 on each side
  const tabWidth = (screenWidth - totalHorizontalPadding) / state.routes.length;

  // Shared value for the sliding indicator position
  const translateX = useSharedValue(0);

  useEffect(() => {
    // Animate the indicator to the new active index
    translateX.value = withSpring(state.index * tabWidth, {
      damping: 15,
      stiffness: 150,
      mass: 0.5,
    });
  }, [state.index, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: tabWidth,
    };
  });

  // Dynamic Colors based on Dark Mode
  const tabBarBg = isDark ? '#1E293B' : '#ffffff'; // Slate-800 vs White
  const borderColor = isDark ? '#334155' : '#E2E8F0'; // Slate-700 vs Slate-200
  const activeIndicatorColor = '#0D9488'; // Teal-600 (stays same or slightly brighter)
  const inactiveIconColor = isDark ? '#94A3B8' : '#64748B'; // Slate-400 vs Slate-500

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <View style={[styles.tabBar, { backgroundColor: tabBarBg, borderColor: borderColor }]}>
        {/* Animated Active Indicator */}
        <Animated.View style={[styles.activeIndicator, animatedIndicatorStyle, { width: tabWidth }]}>
          <View style={[styles.innerIndicator, { backgroundColor: activeIndicatorColor }]} />
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // Icon Mapping based on route name
          let iconName = 'house.fill';
          if (route.name === 'progress') iconName = 'chart.bar.fill';
          if (route.name === 'profile') iconName = 'person.fill';

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              iconName={iconName as any}
              label={options.title || route.name}
              inactiveColor={inactiveIconColor}
            />
          );
        })}
      </View>
    </View>
  );
}

// Sub-component for individual tab items with scale animation
const TabItem = ({ isFocused, onPress, onLongPress, iconName, label, inactiveColor }: any) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.1 : 1, { duration: 500 });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: withTiming(isFocused ? 1 : 0.6, { duration: 200 }),
    };
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <IconSymbol 
          size={26} 
          name={iconName} 
          color={isFocused ? '#ffffff' : inactiveColor} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 24, // Lift it up a bit
  },
  tabBar: {
    flexDirection: 'row',
    // backgroundColor handled dynamically
    borderRadius: 32,
    height: 64,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    // borderColor handled dynamically
  },
  activeIndicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerIndicator: {
    width: '80%',
    height: '100%',
    // backgroundColor handled dynamically
    borderRadius: 24,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
