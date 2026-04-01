/**
 * Indian financial year (April–March) and IBF/PO/{FY}/{seq} formatting.
 * Used for atomic PO number allocation in purchaseOrderService.
 */

import { doc, serverTimestamp, type Firestore, type Transaction } from 'firebase/firestore';

/** Human-readable FY label, e.g. 2026-27 */
export function getIndianFinancialYearLabel(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (m >= 3) {
    const y2 = y + 1;
    return `${y}-${String(y2).slice(-2)}`;
  }
  const y1 = y - 1;
  return `${y1}-${String(y).slice(-2)}`;
}

/**
 * Firestore-safe document id for the FY counter (no slashes).
 * e.g. fy_2026_27 for label 2026-27
 */
export function getIndianFinancialYearCounterDocId(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (m >= 3) {
    const y2 = y + 1;
    return `fy_${y}_${String(y2).slice(-2)}`;
  }
  const y1 = y - 1;
  return `fy_${y1}_${String(y).slice(-2)}`;
}

export function formatIbfPoNumber(fyLabel: string, sequence: number, digitWidth = 3): string {
  return `IBF/PO/${fyLabel}/${String(sequence).padStart(digitWidth, '0')}`;
}

/**
 * Increments the per-FY counter and returns the next PO number string.
 * Must be called inside `runTransaction`.
 */
export async function allocateNextIbfPoNumberInTransaction(
  transaction: Transaction,
  db: Firestore,
  countersCollection: string,
  date: Date = new Date()
): Promise<string> {
  const fyLabel = getIndianFinancialYearLabel(date);
  const fyDocId = getIndianFinancialYearCounterDocId(date);
  const counterRef = doc(db, countersCollection, fyDocId);
  const counterSnap = await transaction.get(counterRef);
  const lastNumber = counterSnap.exists() ? (counterSnap.data()?.lastNumber as number | undefined ?? 0) : 0;
  const nextNumber = lastNumber + 1;
  transaction.set(
    counterRef,
    {
      fyLabel,
      lastNumber: nextNumber,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return formatIbfPoNumber(fyLabel, nextNumber);
}
