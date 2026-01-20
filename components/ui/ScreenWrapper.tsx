import React from 'react';
import { View, ViewProps, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  bgClass?: string;
  safeArea?: boolean;
  gradientColors?: [string, string, ...string[]]; // Optional gradient
}

export const ScreenWrapper = ({
  children,
  bgClass = 'bg-brand-background dark:bg-slate-950',
  safeArea = true,
  gradientColors,
  className = '',
  ...props
}: ScreenWrapperProps) => {
  const Container = safeArea ? SafeAreaView : View;

  const content = (
    <>
      <StatusBar style="auto" />
      <View className="flex-1 px-4">{children}</View>
    </>
  );

  if (gradientColors) {
     if (safeArea) {
         return (
             <LinearGradient colors={gradientColors} className={`flex-1 ${className}`} style={props.style}>
                 <SafeAreaView className="flex-1 px-4">
                     <StatusBar style="auto" />
                     {children}
                 </SafeAreaView>
             </LinearGradient>
         )
     }
    return (
      <LinearGradient
        colors={gradientColors}
        className={`flex-1 ${className}`}
        style={props.style}
      >
         <StatusBar style="auto" />
         <View className="flex-1 px-4">{children}</View>
      </LinearGradient>
    );
  }

  return (
    <Container className={`flex-1 ${bgClass} ${className}`} {...props}>
      <StatusBar style="auto" /> 
      <View className="flex-1 px-4"> 
        {children}
      </View>
    </Container>
  );
};
