import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { TextInput, View, Text, TextInputProps, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';
import { Label } from './Typography';

interface InputProps extends TextInputProps {
  label?: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  error?: string;
}

export const Input = ({
  label,
  iconName,
  error,
  secureTextEntry,
  ...props
}: InputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const focusProgress = useSharedValue(0);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const isSecure = secureTextEntry && !isPasswordVisible;

  const handleFocus = () => {
    focusProgress.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    focusProgress.value = withTiming(0, { duration: 200 });
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [isDark ? '#334155' : '#E2E8F0', error ? '#EF4444' : '#0D9488']
    );

    return {
      borderColor: error ? '#EF4444' : borderColor,
    };
  });

  return (
    <View style={styles.container}>
      {label && (
        <Label className="mb-2">
          {label}
        </Label>
      )}
      <Animated.View 
        style={[
          styles.inputContainer, 
          isDark && styles.inputContainerDark,
          error && styles.inputError,
          animatedContainerStyle
        ]}
      >
        {iconName && (
          <MaterialCommunityIcons
            name={iconName}
            size={20}
            color={error ? '#EF4444' : '#94A3B8'}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.textInput, isDark && styles.textInputDark]}
          placeholderTextColor="#94A3B8"
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeButton}>
            <MaterialCommunityIcons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  // label styles removed in favor of Typography Label
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  inputContainerDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  icon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  textInputDark: {
    color: '#F8FAFC',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#EF4444',
  },
});
