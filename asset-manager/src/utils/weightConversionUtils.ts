/**
 * Weight conversion utilities for steel items.
 * Formula: Total Weight = weightPerMeter (kg/m) × lengthPerPiece (m) × quantity
 *
 * Unit conversions:
 * - 1 Ton (MT) = 1000 Kg (all weights stored internally in Kg)
 * - Inventory is always stored as pieces; KG/Ton are converted to pieces for storage
 */

/** 1 Ton = 1000 Kg - use when converting Ton input to Kg for kgToPieces */
export const TON_TO_KG = 1000;

/**
 * Convert Ton to Kg for use with kgToPieces.
 * Use when user enters weight in Ton (e.g. from invoice).
 */
export function tonToKg(ton: number): number {
  return ton * TON_TO_KG;
}

/**
 * Check if item supports weight-based operations (has weightPerMeter)
 */
export function isWeightBasedItem(item: { weightPerMeter?: number }): boolean {
  return typeof item?.weightPerMeter === 'number' && item.weightPerMeter > 0;
}

/**
 * Check if item supports Pcs/Kg view toggle (steel items with full weight config).
 * Use this to decide when to show the ViewModeToggle; requires both weightPerMeter
 * and lengthPerPiece so Kg can be calculated.
 */
export function isWeightViewSupported(item: {
  weightPerMeter?: number;
  lengthPerPiece?: number;
}): boolean {
  return (
    isWeightBasedItem(item) &&
    typeof item?.lengthPerPiece === 'number' &&
    item.lengthPerPiece > 0
  );
}

/**
 * Calculate weight from pieces.
 * Formula: pieces × lengthPerPiece × weightPerMeter
 */
export function piecesToKg(
  pieces: number,
  weightPerMeter: number,
  lengthPerPiece: number
): number {
  if (weightPerMeter <= 0 || lengthPerPiece <= 0) return 0;
  return pieces * lengthPerPiece * weightPerMeter;
}

export interface KgToPiecesResult {
  isExact: boolean;
  pieces: number;
  actualKg: number;
  weightPerPiece: number;
  suggestions?: Array<{ pieces: number; kg: number }>;
}

/**
 * Calculate pieces from weight.
 * Returns result with isExact flag and optional suggestions for inexact conversions.
 */
export function kgToPieces(
  kg: number,
  weightPerMeter: number,
  lengthPerPiece: number
): KgToPiecesResult {
  const weightPerPiece = weightPerMeter * lengthPerPiece;
  if (weightPerPiece <= 0) {
    return {
      isExact: false,
      pieces: 0,
      actualKg: kg,
      weightPerPiece: 0,
    };
  }

  const calculatedPieces = kg / weightPerPiece;
  const EPSILON = 0.0001;
  const roundedPieces = Math.round(calculatedPieces);
  const isExact = Math.abs(calculatedPieces - roundedPieces) < EPSILON;

  if (!isExact) {
    const floorPieces = Math.floor(calculatedPieces);
    const ceilPieces = Math.ceil(calculatedPieces);
    const floorKg = floorPieces * weightPerPiece;
    const ceilKg = ceilPieces * weightPerPiece;

    return {
      isExact: false,
      pieces: calculatedPieces,
      actualKg: kg,
      weightPerPiece,
      suggestions: [
        { pieces: floorPieces, kg: floorKg },
        { pieces: ceilPieces, kg: ceilKg },
      ],
    };
  }

  return {
    isExact: true,
    pieces: roundedPieces,
    actualKg: kg,
    weightPerPiece,
  };
}

/**
 * Get conversion error message with helpful examples
 */
export function getConversionErrorMessage(
  enteredKg: number,
  weightPerMeter: number,
  lengthPerPiece: number
): string {
  const result = kgToPieces(enteredKg, weightPerMeter, lengthPerPiece);
  const weightPerPiece = result.weightPerPiece;

  if (result.isExact) {
    return '';
  }

  const formattedKg = enteredKg.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  let message = `Cannot convert ${formattedKg} kg to exact pieces.\n\n`;
  message += `The weight per piece is ${weightPerPiece} kg (${weightPerMeter} kg/m × ${lengthPerPiece}m).\n\n`;

  if (result.suggestions && result.suggestions.length > 0) {
    message += 'Please enter one of these exact amounts:\n';
    result.suggestions.forEach((s) => {
      const formattedSuggestionKg = s.kg.toLocaleString('en-IN', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      message += `• ${s.pieces} pieces = ${formattedSuggestionKg} kg\n`;
    });
  }

  message +=
    '\nWhy this matters: Inventory is tracked in whole pieces. Partial pieces would cause stock discrepancies.';

  return message;
}

/**
 * Calculate total weight for display
 */
export function calculateTotalWeight(
  quantity: number,
  weightPerMeter: number,
  lengthPerPiece: number
): number {
  return piecesToKg(quantity, weightPerMeter, lengthPerPiece);
}

/**
 * Format weight for display (handles Ton conversion)
 */
export function formatWeight(kg: number, unit: 'Kg' | 'Ton (MT)'): string {
  if (unit === 'Ton (MT)') {
    const tons = kg / 1000;
    return tons >= 1
      ? `${tons.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Ton`
      : `${kg.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Kg`;
  }
  return `${kg.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Kg`;
}
