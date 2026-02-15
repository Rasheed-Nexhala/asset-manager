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
  rightAction?: ScreenHeaderRightAction;
}

const HEADER_HEIGHT = 56;
const DEFAULT_ICON_SIZE = 24;
const DEFAULT_ICON_COLOR = '#1E40AF';

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  rightAction,
}) => {
  const isLoading = rightAction?.loading ?? false;
  const hasLabel = Boolean(rightAction?.label);
  const hasIcon = Boolean(rightAction?.icon);
  const showRightAction = rightAction != null && (hasLabel || hasIcon);

  if (rightAction && !hasLabel && !hasIcon) {
    console.warn(
      'ScreenHeader: rightAction must have either a label or icon property. Action will not be rendered.'
    );
  }

  const iconSize = rightAction?.iconSize ?? DEFAULT_ICON_SIZE;
  const iconColor = rightAction?.iconColor ?? DEFAULT_ICON_COLOR;

  const getAccessibilityLabel = () => {
    if (isLoading) {
      return (
        rightAction?.accessibilityLabelLoading ??
        (hasLabel ? `${rightAction?.label}, please wait` : 'Loading, please wait')
      );
    }
    return (
      rightAction?.accessibilityLabel ??
      (hasLabel ? rightAction?.label : (hasIcon ? 'Action button' : undefined))
    );
  };

  const renderActionContent = () => {
    if (isLoading) {
      return <ActivityIndicator size="small" color={DEFAULT_ICON_COLOR} />;
    }

    const content: React.ReactNode[] = [];

    if (hasIcon) {
      content.push(
        <Ionicons
          key="icon"
          name={rightAction!.icon!}
          size={iconSize}
          color={iconColor}
        />
      );
    }

    if (hasLabel) {
      content.push(
        <Text
          key="label"
          className={`text-[15px] font-semibold text-[#1E40AF] ${hasIcon ? 'ml-2' : ''}`}
        >
          {rightAction!.label}
        </Text>
      );
    }

    return content.length > 0 ? (
      <View className="flex-row items-center">{content}</View>
    ) : null;
  };

  const showBackButton = showBack && typeof onBackPress === 'function';

  const hasLeftOrRight = showBackButton || showRightAction;

  return (
    <View
      className="bg-white border-b border-[#E2E8F0] px-4 flex-row items-center justify-between"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Left: flex-1 for equal width with right, ensuring title stays centered */}
      {hasLeftOrRight ? (
        <View className="flex-1 flex-row items-center justify-start min-w-0">
          {showBackButton ? (
            <TouchableOpacity
              className="w-11 h-11 items-center justify-center -ml-1"
              onPress={onBackPress}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Title: always centered via flex-1 text-center */}
      <Text
        className="text-[22px] font-semibold text-[#0F172A] flex-1 text-center"
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Right: flex-1 for equal width with left, ensuring title stays centered */}
      {hasLeftOrRight ? (
        <View className="flex-1 flex-row items-center justify-end min-w-0">
          {showRightAction ? (
            <TouchableOpacity
              className={`min-w-[48px] h-12 items-center justify-center rounded-[10px] ${
                isLoading ? 'opacity-50' : ''
              }`}
              activeOpacity={0.7}
              onPress={rightAction.onPress}
              disabled={isLoading}
              accessibilityLabel={getAccessibilityLabel()}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
            >
              {renderActionContent()}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};
