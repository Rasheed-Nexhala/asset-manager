import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export interface QuickStat {
  icon: string;
  value: number | string;
  label: string;
}

export interface QuickStatsRowProps {
  stats: QuickStat[];
  /** When true and value is 0/empty, show placeholder "—" instead */
  isLoading?: boolean;
}

const CARD_MIN_WIDTH = 160;

/**
 * Horizontal row of KPI cards for dashboard metrics.
 * Uses fixed card width to ensure horizontal scroll works on all screen sizes.
 */
export function QuickStatsRow({ stats, isLoading = false }: QuickStatsRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scrollView}
    >
      {stats.map((stat, index) => {
        const showPlaceholder = isLoading && (stat.value === 0 || stat.value === '');
        return (
          <View
            key={index}
            style={[styles.card, index < stats.length - 1 && styles.cardGap]}
            accessibilityLabel={`${stat.label}: ${showPlaceholder ? 'loading' : stat.value}`}
          >
            <Text className="text-2xl mb-2">{stat.icon}</Text>
            <Text className="text-[32px] font-bold text-[#0F172A]">
              {showPlaceholder ? '—' : stat.value}
            </Text>
            <Text className="text-[13px] text-[#64748B]">{stat.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginHorizontal: -16,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: CARD_MIN_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardGap: {
    marginRight: 12,
  },
});
