import React from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

export interface ScreenLayoutProps {
  children: React.ReactNode;
  edges?: Edge[];
  keyboardAware?: boolean;
  keyboardVerticalOffset?: number;
  behavior?: 'height' | 'position' | 'padding';
  className?: string;
}

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  children,
  edges,
  keyboardAware = false,
  keyboardVerticalOffset,
  behavior,
  className,
}) => {
  const safeAreaClassName = ['flex-1', 'bg-[#F8FAFC]', className]
    .filter(Boolean)
    .join(' ');

  if (keyboardAware) {
    return (
      <SafeAreaView className={safeAreaClassName} edges={edges}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={behavior ?? (Platform.OS === 'ios' ? 'padding' : 'height')}
          keyboardVerticalOffset={keyboardVerticalOffset ?? (Platform.OS === 'ios' ? 0 : 20)}
        >
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={safeAreaClassName} edges={edges}>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
};
