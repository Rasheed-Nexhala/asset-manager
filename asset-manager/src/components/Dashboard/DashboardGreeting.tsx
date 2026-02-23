import React from 'react';
import { View, Text } from 'react-native';

export interface DashboardGreetingProps {
  displayName: string;
  role: string;
  siteName?: string;
}

/**
 * Dashboard greeting component showing personalized welcome message.
 * Always shows the user's display name (not role).
 * For Site Manager: shows site name as subtitle.
 * For other roles: shows formatted date as subtitle.
 */
export function DashboardGreeting({
  displayName,
  role,
  siteName,
}: DashboardGreetingProps) {
  const greetingName = displayName || 'there';
  const subtitle =
    role === 'Site Manager' && siteName
      ? siteName
      : new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

  return (
    <View>
      <Text
        className="text-[22px] font-semibold text-[#0F172A]"
        accessibilityRole="header"
      >
        Hello, {greetingName}
      </Text>
      <Text className="text-[13px] text-[#64748B] mt-0.5">{subtitle}</Text>
    </View>
  );
}
