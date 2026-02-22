import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ScreenHeaderRightAction {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  onPress: () => void;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityLabelLoading?: string;
}

export interface ScreenHeaderProps {
  title: string;
  /** When true, shows a back button on the left. Requires onBackPress. */
  showBack?: boolean;
  /** Called when back button is pressed. Required when showBack is true. */
  onBackPress?: () => void;
  /** Optional left action (icon or label). Ignored when showBack is true. */
  leftAction?: ScreenHeaderRightAction;
  rightAction?: ScreenHeaderRightAction;
}

const DEFAULT_ICON_SIZE = 24;
const DEFAULT_ICON_COLOR = '#1E40AF';

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  leftAction,
  rightAction,
}) => {
  const hasLeftLabel = Boolean(leftAction?.label);
  const hasLeftIcon = Boolean(leftAction?.icon);
  const showLeftAction =
    !showBack &&
    leftAction != null &&
    (hasLeftLabel || hasLeftIcon);

  const rightLoading = rightAction?.loading ?? false;
  const hasRightLabel = Boolean(rightAction?.label);
  const hasRightIcon = Boolean(rightAction?.icon);
  const showRightAction = rightAction != null && (hasRightLabel || hasRightIcon);

  if (rightAction && !hasRightLabel && !hasRightIcon) {
    console.warn(
      'ScreenHeader: rightAction must have either a label or icon property. Action will not be rendered.'
    );
  }
  if (leftAction && !hasLeftLabel && !hasLeftIcon) {
    console.warn(
      'ScreenHeader: leftAction must have either a label or icon property. Action will not be rendered.'
    );
  }

  const rightIconSize = rightAction?.iconSize ?? DEFAULT_ICON_SIZE;
  const rightIconColor = rightAction?.iconColor ?? DEFAULT_ICON_COLOR;
  const leftIconSize = leftAction?.iconSize ?? DEFAULT_ICON_SIZE;
  const leftIconColor = leftAction?.iconColor ?? DEFAULT_ICON_COLOR;

  const getRightAccessibilityLabel = () => {
    if (rightLoading) {
      return (
        rightAction?.accessibilityLabelLoading ??
        (hasRightLabel ? `${rightAction?.label}, please wait` : 'Loading, please wait')
      );
    }
    return (
      rightAction?.accessibilityLabel ??
      (hasRightLabel ? rightAction?.label : (hasRightIcon ? 'Action button' : undefined))
    );
  };

  const renderRightActionContent = () => {
    if (rightLoading) {
      return (
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color={DEFAULT_ICON_COLOR} />
          <Text className="text-[15px] font-semibold text-[#1E40AF] ml-2">
            Please wait…
          </Text>
        </View>
      );
    }

    const content: React.ReactNode[] = [];

    if (hasRightIcon) {
      content.push(
        <Ionicons
          key="icon"
          name={rightAction!.icon!}
          size={rightIconSize}
          color={rightIconColor}
        />
      );
    }

    if (hasRightLabel) {
      content.push(
        <Text
          key="label"
          className={`text-[15px] font-semibold text-[#1E40AF] ${hasRightIcon ? 'ml-2' : ''}`}
        >
          {rightAction!.label}
        </Text>
      );
    }

    return content.length > 0 ? (
      <View className="flex-row items-center">{content}</View>
    ) : null;
  };

  const renderLeftActionContent = () => {
    const content: React.ReactNode[] = [];

    if (hasLeftIcon) {
      content.push(
        <Ionicons
          key="icon"
          name={leftAction!.icon!}
          size={leftIconSize}
          color={leftIconColor}
        />
      );
    }

    if (hasLeftLabel) {
      content.push(
        <Text
          key="label"
          className={`text-[15px] font-semibold text-[#1E40AF] ${hasLeftIcon ? 'ml-2' : ''}`}
        >
          {leftAction!.label}
        </Text>
      );
    }

    return content.length > 0 ? (
      <View className="flex-row items-center">{content}</View>
    ) : null;
  };

  const showBackButton = showBack && typeof onBackPress === 'function';

  return (
    <View className="bg-white border-b border-[#E2E8F0] px-4 flex-row items-center justify-between h-14">
      {/* Left: Back button, left action, or spacer when no back/left but has right action (for centering) */}
      {showBackButton ? (
        <TouchableOpacity
          className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center -ml-1"
          onPress={onBackPress}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
      ) : showLeftAction ? (
        <TouchableOpacity
          className="min-w-[48px] min-h-[48px] w-12 h-12 items-center justify-center -ml-1 rounded-[10px]"
          onPress={leftAction!.onPress}
          activeOpacity={0.7}
          accessibilityLabel={
            leftAction?.accessibilityLabel ??
            (hasLeftLabel ? leftAction?.label : (hasLeftIcon ? 'Action button' : undefined))
          }
          accessibilityRole="button"
        >
          {renderLeftActionContent()}
        </TouchableOpacity>
      ) : showRightAction ? (
        <View className="min-w-[48px] w-12" />
      ) : null}

      {/* Title: always centered via flex-1 text-center */}
      <Text
        className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Right: Action, or spacer for balance when back is shown */}
      {showRightAction ? (
        <TouchableOpacity
          className={`min-w-[48px] h-12 items-center justify-center rounded-[10px] ${
            rightLoading ? 'opacity-50' : ''
          }`}
          activeOpacity={0.7}
          onPress={rightAction.onPress}
          disabled={rightLoading}
          accessibilityLabel={getRightAccessibilityLabel()}
          accessibilityRole="button"
          accessibilityState={{ disabled: rightLoading, busy: rightLoading }}
        >
          {renderRightActionContent()}
        </TouchableOpacity>
      ) : showBackButton ? (
        <View className="min-w-[48px] w-12" />
      ) : null}
    </View>
  );
};
