# NativeWind Component Examples

This file contains detailed examples of common React Native components styled with NativeWind.

## Navigation Header

```tsx
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

export const Header = ({ title, onBackPress, rightAction }: HeaderProps) => {
  return (
    <SafeAreaView className="bg-white border-b border-gray-200">
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center flex-1">
          {onBackPress && (
            <Pressable
              onPress={onBackPress}
              className="mr-3 p-2 -ml-2"
            >
              <Text className="text-xl">←</Text>
            </Pressable>
          )}
          <Text className="text-xl font-bold text-gray-900 flex-1">
            {title}
          </Text>
        </View>
        {rightAction && (
          <View className="ml-2">
            {rightAction}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};
```

## Search Bar

```tsx
import { View, TextInput } from 'react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) => {
  return (
    <View className="px-4 py-2 bg-gray-100 rounded-lg flex-row items-center">
      <Text className="text-gray-400 mr-2">🔍</Text>
      <TextInput
        className="flex-1 text-base text-gray-900"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
};
```

## Badge/Pill

```tsx
interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = ({ label, variant = 'default', size = 'md' }: BadgeProps) => {
  const variantClasses = {
    default: 'bg-gray-200 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <View className={`
      rounded-full ${variantClasses[variant]} ${sizeClasses[size]}
      items-center justify-center
    `}>
      <Text className={`font-medium ${variantClasses[variant].split(' ')[1]}`}>
        {label}
      </Text>
    </View>
  );
};
```

## Loading Spinner Container

```tsx
import { ActivityIndicator, View, Text } from 'react-native';

interface LoadingViewProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingView = ({ message, fullScreen = false }: LoadingViewProps) => {
  const containerClasses = fullScreen
    ? 'flex-1 items-center justify-center bg-white'
    : 'items-center justify-center py-8';

  return (
    <View className={containerClasses}>
      <ActivityIndicator size="large" color="#2563EB" />
      {message && (
        <Text className="mt-4 text-gray-600 text-base">
          {message}
        </Text>
      )}
    </View>
  );
};
```

## Empty State

```tsx
interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon = '📭',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-6xl mb-4">{icon}</Text>
      <Text className="text-xl font-bold text-gray-900 text-center mb-2">
        {title}
      </Text>
      {message && (
        <Text className="text-base text-gray-600 text-center mb-6">
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          className="bg-blue-600 px-6 py-3 rounded-lg"
          onPress={onAction}
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};
```

## Modal/Dialog

```tsx
import { Modal, View, Text, Pressable } from 'react-native';

interface DialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const Dialog = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: DialogProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/50">
        <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-sm">
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {title}
          </Text>
          <Text className="text-base text-gray-600 mb-6">
            {message}
          </Text>
          <View className="flex-row justify-end space-x-3">
            <Pressable
              onPress={onCancel}
              className="px-4 py-2"
            >
              <Text className="text-gray-600 font-medium">{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-white font-semibold">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

## Tab Bar

```tsx
interface TabBarProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const TabBar = ({ tabs, activeTab, onTabChange }: TabBarProps) => {
  return (
    <View className="flex-row border-b border-gray-200 bg-white">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            className={`
              flex-1 py-3 border-b-2
              ${isActive ? 'border-blue-600' : 'border-transparent'}
            `}
          >
            <Text
              className={`
                text-center font-medium
                ${isActive ? 'text-blue-600' : 'text-gray-600'}
              `}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
```

## Avatar

```tsx
import { View, Text, Image } from 'react-native';

interface AvatarProps {
  source?: { uri: string };
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar = ({ source, name, size = 'md' }: AvatarProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl',
  };

  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View className={`
      ${sizeClasses[size]} rounded-full bg-blue-500
      items-center justify-center overflow-hidden
    `}>
      {source ? (
        <Image source={source} className="w-full h-full" />
      ) : (
        <Text className={`${textSizeClasses[size]} font-bold text-white`}>
          {initials}
        </Text>
      )}
    </View>
  );
};
```

## Progress Bar

```tsx
interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
}

export const ProgressBar = ({ progress, color = 'bg-blue-600', height = 4 }: ProgressBarProps) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
      <View
        className={`${color} h-full rounded-full`}
        style={{ width: `${clampedProgress * 100}%` }}
      />
    </View>
  );
};
```

## Divider

```tsx
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
}

export const Divider = ({ orientation = 'horizontal', spacing = 0 }: DividerProps) => {
  if (orientation === 'vertical') {
    return <View className={`bg-gray-200 w-px ${spacing > 0 ? `my-${spacing}` : ''}`} />;
  }

  return <View className={`bg-gray-200 h-px ${spacing > 0 ? `my-${spacing}` : ''}`} />;
};
```

## Card with Shadow

```tsx
interface ShadowCardProps {
  children: React.ReactNode;
  className?: string;
}

export const ShadowCard = ({ children, className = '' }: ShadowCardProps) => {
  return (
    <View className={`
      bg-white rounded-xl p-4
      shadow-lg shadow-black/10
      ${className}
    `}>
      {children}
    </View>
  );
};
```

## Form Section

```tsx
interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

export const FormSection = ({ title, children }: FormSectionProps) => {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        {title}
      </Text>
      <View className="space-y-4">
        {children}
      </View>
    </View>
  );
};
```
