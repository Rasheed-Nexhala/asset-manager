/**
 * Display quantity with optional weight for weight-based items
 */

import React from 'react';
import { Text } from 'react-native';
import {
  isWeightBasedItem,
  calculateTotalWeight,
  formatWeight,
} from '../../utils/weightConversionUtils';
import type { WeightViewMode } from '../../hooks/useWeightViewPreference';

export interface WeightDisplayProps {
  quantity: number;
  weightPerMeter?: number;
  lengthPerPiece?: number;
  viewMode: WeightViewMode;
  unit: string;
  size?: 'normal' | 'large';
}

export const WeightDisplay: React.FC<WeightDisplayProps> = ({
  quantity,
  weightPerMeter,
  lengthPerPiece,
  viewMode,
  unit,
  size = 'normal',
}) => {
  const textClass = size === 'large' ? 'text-[32px] font-bold' : 'text-[15px]';
  const isWeightBased =
    isWeightBasedItem({ weightPerMeter }) &&
    weightPerMeter != null &&
    lengthPerPiece != null &&
    lengthPerPiece > 0;

  if (!isWeightBased) {
    return (
      <Text className={`${textClass} text-[#0F172A]`}>
        {quantity.toLocaleString('en-IN')} {unit}
      </Text>
    );
  }

  const totalKg = calculateTotalWeight(
    quantity,
    weightPerMeter ?? 0,
    lengthPerPiece ?? 0
  );
  const weightDisplay =
    unit === 'Ton (MT)'
      ? formatWeight(totalKg, 'Ton (MT)')
      : formatWeight(totalKg, 'Kg');

  if (viewMode === 'pieces') {
    return (
      <Text className={`${textClass} text-[#0F172A]`}>
        {quantity.toLocaleString('en-IN')} Pcs
      </Text>
    );
  }

  return (
    <Text className={`${textClass} text-[#0F172A]`}>
      {weightDisplay}
    </Text>
  );
};
