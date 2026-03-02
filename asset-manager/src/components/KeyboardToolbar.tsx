/**
 * KeyboardToolbar — Input accessory shown above the keyboard
 *
 * Provides "Next" and "Done" buttons for forms. Especially useful for
 * decimal-pad and number-pad keyboards that lack a built-in Done/Return key.
 *
 * - iOS: Uses InputAccessoryView (native toolbar above keyboard)
 * - Android: InputAccessoryView is not supported; users dismiss via back or tap-outside
 *
 * Usage:
 *   <KeyboardToolbar nativeID="myToolbar" onDone={() => Keyboard.dismiss()} showNext onNext={focusNext} />
 *   <TextInput inputAccessoryViewID="myToolbar" ... />
 */

import React from 'react';
import {
  InputAccessoryView,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native';

export interface KeyboardToolbarProps {
  /** Unique ID to link with TextInput's inputAccessoryViewID */
  nativeID: string;
  /** Called when Done is pressed; typically Keyboard.dismiss() */
  onDone: () => void;
  /** Called when Next is pressed; typically focus next field */
  onNext?: () => void;
  /** When true, shows Next button (for moving to next field) */
  showNext?: boolean;
}

export const KeyboardToolbar: React.FC<KeyboardToolbarProps> = ({
  nativeID,
  onDone,
  onNext,
  showNext = false,
}) => {
  const handleDone = () => {
    onDone();
  };

  const toolbarContent = (
    <View className="flex-row items-center justify-end gap-2 bg-[#F8FAFC] border-t border-[#E2E8F0] px-4 py-2">
      {showNext && onNext && (
        <TouchableOpacity
          onPress={onNext}
          className="min-h-[44px] min-w-[44px] items-center justify-center px-4"
          accessibilityRole="button"
          accessibilityLabel="Next field"
        >
          <Text className="text-[15px] font-semibold text-[#1E40AF]">Next</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={handleDone}
        className="min-h-[44px] min-w-[44px] items-center justify-center px-4"
        accessibilityRole="button"
        accessibilityLabel="Done"
      >
        <Text className="text-[15px] font-semibold text-[#1E40AF]">Done</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      {toolbarContent}
    </InputAccessoryView>
  );
};
