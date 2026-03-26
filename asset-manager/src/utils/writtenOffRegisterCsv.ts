import type { Maintenance, IssueType, WriteOffReason } from '../types/maintenance';
import { formatDateForCsv } from './csvExport';
import { getDisplayWrittenOffUnits } from './maintenanceWriteOffDisplay';

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return `"${s}"`;
}

const issueTypeLabels: Record<IssueType, string> = {
  motor_electrical: 'Motor/Electrical',
  physical_damage: 'Physical Damage',
  wear_and_tear: 'Wear and Tear',
  missing_parts: 'Missing Parts',
  other: 'Other',
};

const writeOffReasonLabels: Record<WriteOffReason, string> = {
  beyond_repair: 'Beyond Repair',
  high_repair_cost: 'High Repair Cost',
  obsolete: 'Obsolete',
  lost_stolen: 'Lost/Stolen',
  other: 'Other',
};

const statusLabels: Record<string, string> = {
  written_off: 'Written Off',
  partially_returned_and_written_off: 'Partial Return & Written Off',
};

/**
 * CSV for the written-off maintenance register (audit / disposal trail).
 */
export function buildWrittenOffRegisterCsv(records: Maintenance[]): string {
  const header = [
    'Record ID',
    'Item ID',
    'Item Name',
    'SKU',
    'Unit',
    'Status',
    'Units Written Off',
    'Written Off At',
    'Write-off Reason',
    'Write-off Explanation',
    'Issue Type',
    'Added At',
    'Added By',
  ]
    .map(escapeCsvField)
    .join(',');

  const rows = records.map((r) => {
    const reason = r.writeOffReason
      ? writeOffReasonLabels[r.writeOffReason] ?? r.writeOffReason
      : '';
    const issue = issueTypeLabels[r.issueType] ?? r.issueType ?? '';
    const unitsWrittenOff = getDisplayWrittenOffUnits(r);

    return [
      r.id,
      r.itemId,
      r.itemName,
      r.itemSku,
      r.unit ?? 'Pcs',
      statusLabels[r.status] ?? r.status,
      unitsWrittenOff != null ? unitsWrittenOff : '',
      formatDateForCsv(r.writtenOffAt),
      reason,
      r.writeOffExplanation?.trim() ?? '',
      issue,
      formatDateForCsv(r.addedAt),
      r.addedByName ?? '',
    ]
      .map(escapeCsvField)
      .join(',');
  });

  return `${header}\n${rows.join('\n')}`;
}
