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
  /** Optional badge count (e.g. unread notifications) */
  badge?: number;
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
  /** Single right action. Ignored when rightActions is provided. */
  rightAction?: ScreenHeaderRightAction;
  /** Multiple right actions (e.g. notification bell + users). Rendered left-to-right. */
  rightActions?: ScreenHeaderRightAction[];
}

const DEFAULT_ICON_SIZE = 24;
const DEFAULT_ICON_COLOR = '#1E40AF';

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  leftAction,
  rightAction,
  rightActions,
}) => {
  const hasLeftLabel = Boolean(leftAction?.label);
  const hasLeftIcon = Boolean(leftAction?.icon);
  const showLeftAction =
    !showBack &&
    leftAction != null &&
    (hasLeftLabel || hasLeftIcon);

  const actions = rightActions ?? (rightAction ? [rightAction] : []);
  const rightLoading = actions.some((a) => a.loading);
  const hasRightLabel = actions.some((a) => Boolean(a.label));
  const hasRightIcon = actions.some((a) => Boolean(a.icon));
  const showRightAction = actions.length > 0 && (hasRightLabel || hasRightIcon);

  if (rightAction && !rightActions && !hasRightLabel && !hasRightIcon) {
    console.warn(
      'ScreenHeader: rightAction must have either a label or icon property. Action will not be rendered.'
    );
  }
  if (leftAction && !hasLeftLabel && !hasLeftIcon) {
    console.warn(
      'ScreenHeader: leftAction must have either a label or icon property. Action will not be rendered.'
    );
  }

  const leftIconSize = leftAction?.iconSize ?? DEFAULT_ICON_SIZE;
  const leftIconColor = leftAction?.iconColor ?? DEFAULT_ICON_COLOR;

  const firstAction = actions[0];
  const getRightAccessibilityLabel = (action?: ScreenHeaderRightAction) => {
    const a = action ?? firstAction;
    if (rightLoading && a) {
      return (
        a.accessibilityLabelLoading ??
        (a.label ? `${a.label}, please wait` : 'Loading, please wait')
      );
    }
    return (
      a?.accessibilityLabel ??
      (a?.label ? a.label : (a?.icon ? 'Action button' : undefined))
    );
  };

  const renderRightActionContent = (action: ScreenHeaderRightAction, index: number) => {
    if (action.loading) {
      return (
        <View key={index} className="flex-row items-center">
          <ActivityIndicator size="small" color={DEFAULT_ICON_COLOR} />
          <Text className="text-[15px] font-semibold text-[#1E40AF] ml-2">
            Please wait…
          </Text>
        </View>
      );
    }

    const content: React.ReactNode[] = [];
    const hasIcon = Boolean(action.icon);
    const hasLabel = Boolean(action.label);

    if (hasIcon) {
      content.push(
        <Ionicons
          key="icon"
          name={action.icon!}
          size={action.iconSize ?? DEFAULT_ICON_SIZE}
          color={action.iconColor ?? DEFAULT_ICON_COLOR}
        />
      );
    }

    if (hasLabel) {
      content.push(
        <Text
          key="label"
          className={`text-[15px] font-semibold text-[#1E40AF] ${hasIcon ? 'ml-2' : ''}`}
        >
          {action.label}
        </Text>
      );
    }

    const inner = content.length > 0 ? (
      <View className="flex-row items-center">{content}</View>
    ) : null;

    if (action.badge != null && action.badge > 0) {
      return (
        <View key={index} className="relative">
          {inner}
          <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#DC2626] items-center justify-center px-1">
            <Text className="text-[10px] font-bold text-white">
              {action.badge > 99 ? '99+' : action.badge}
            </Text>
          </View>
        </View>
      );
    }
    return inner ? <View key={index}>{inner}</View> : null;
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

      {/* Right: Action(s), or spacer for balance when back is shown */}
      {showRightAction ? (
        <View className="flex-row items-center gap-1">
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className={`min-w-[44px] h-12 items-center justify-center rounded-[10px] ${
                action.loading ? 'opacity-50' : ''
              }`}
              activeOpacity={0.7}
              onPress={action.onPress}
              disabled={action.loading ?? false}
              accessibilityLabel={getRightAccessibilityLabel(action)}
              accessibilityRole="button"
              accessibilityState={{ disabled: action.loading ?? false, busy: action.loading ?? false }}
            >
              {renderRightActionContent(action, index)}
            </TouchableOpacity>
          ))}
        </View>
      ) : showBackButton ? (
        <View className="min-w-[48px] w-12" />
      ) : null}
    </View>
  );
};
