import React from 'react';
import { ActivityIndicator, Modal, Platform, View, Text, TouchableOpacity } from 'react-native';
import { H2, P } from './Typography';

export type ThinkingOverlayProps = {
  visible: boolean;
  title?: string;
  message?: string;
  cancelText?: string;
  retryText?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  /** If true, hides Cancel button to prevent closing while processing */
  blocking?: boolean;
};

/**
 * ThinkingOverlay: Full-screen modal overlay with spinner and optional actions.
 * Use during post-processing (e.g., AI analysis) to indicate background work.
 */
export default function ThinkingOverlay({
  visible,
  title = 'Thinking...',
  message,
  cancelText = 'Cancel',
  retryText = 'Retry',
  onCancel,
  onRetry,
  blocking = false,
}: ThinkingOverlayProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black/40 justify-center items-center p-6">
        <View className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-6 items-center shadow-xl">
          <ActivityIndicator size="large" color="#0D9488" className="mb-4" />
          <H2 className="text-center mb-2 text-slate-800 dark:text-slate-100">{title}</H2>
          {message && (
            <P className="text-center text-slate-600 dark:text-slate-300 mb-6 opacity-90">
              {message}
            </P>
          )}

          <View className="flex-row gap-3 w-full justify-center">
            {!blocking && onCancel && (
              <TouchableOpacity 
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 min-w-[100px] items-center"
                onPress={onCancel}
              >
                <Text className="text-slate-600 dark:text-slate-300 font-semibold">{cancelText}</Text>
              </TouchableOpacity>
            )}
            {onRetry && (
              <TouchableOpacity 
                className="px-4 py-3 rounded-xl bg-brand-primary min-w-[100px] items-center shadow-sm"
                onPress={onRetry}
              >
                <Text className="text-white font-semibold">{retryText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
