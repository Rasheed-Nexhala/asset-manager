import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

/**
 * Props for the optional right-side action (e.g. "Sign out").
 * When provided, the header shows a button with optional loading state.
 */
export interface ScreenHeaderRightAction {
  /** Button label, e.g. "Sign out" */
  label: string;
  /** Called when the button is pressed */
  onPress: () => void;
  /** When true, shows a spinner and disables the button */
  loading?: boolean;
  /** Accessibility label when not loading (e.g. "Sign out") */
  accessibilityLabel?: string;
  /** Accessibility label when loading (e.g. "Signing out, please wait") */
  accessibilityLabelLoading?: string;
}

export interface ScreenHeaderProps {
  /** Screen title shown on the left (e.g. "Dashboard", "Profile", "Profiles") */
  title: string;
  /**
   * Optional right-side action. Use for primary actions like "Sign out".
   * Omit for title-only headers (e.g. Dashboard).
   */
  rightAction?: ScreenHeaderRightAction;
}

/**
 * Reusable screen header with consistent CIAMS styling.
 * Use on Dashboard, Profile, Profiles (SignedIn), and any screen that needs
 * a top bar with title and optional action button.
 *
 * @example Title only (Dashboard)
 * <ScreenHeader title="Dashboard" />
 *
 * @example Title + Sign out
 * <ScreenHeader
 *   title="Profile"
 *   rightAction={{
 *     label: "Sign out",
 *     onPress: handleLogout,
 *     loading: isLoading,
 *     accessibilityLabel: "Sign out",
 *     accessibilityLabelLoading: "Signing out, please wait",
 *   }}
 * />
 */
/** Fixed header height so title-only and title+action variants match (CIAMS). */
const HEADER_HEIGHT = 56;

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, rightAction }) => {
  const isLoading = rightAction?.loading ?? false;
  const showRightAction = rightAction != null;

  return (
    <View
      className={`bg-white border-b border-[#E2E8F0] px-4 flex-row items-center ${
        showRightAction ? 'justify-between' : 'justify-start'
      }`}
      style={{ height: HEADER_HEIGHT }}
    >
      <Text
        className="text-[22px] font-semibold text-[#0F172A]"
        accessibilityRole="header"
      >
        {title}
      </Text>
      {showRightAction && (
        <TouchableOpacity
          className={`min-w-[48px] h-12 items-center justify-center rounded-[10px] ${
            isLoading ? 'opacity-50' : ''
          }`}
          activeOpacity={0.7}
          onPress={rightAction.onPress}
          disabled={isLoading}
          accessibilityLabel={
            isLoading
              ? rightAction.accessibilityLabelLoading ?? `${rightAction.label}, please wait`
              : rightAction.accessibilityLabel ?? rightAction.label
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading, busy: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#1E40AF" />
          ) : (
            <Text className="text-[15px] font-semibold text-[#1E40AF]">
              {rightAction.label}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};
