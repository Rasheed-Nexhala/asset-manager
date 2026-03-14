import type { IconName } from '../shared/Icon';

/** Maps activityLogConfig icon names (Ionicons) to our Icon component names */
export const ACTIVITY_ICON_MAP: Record<string, IconName> = {
  'document-text-outline': 'document-text',
  'log-in-outline': 'arrow-path',
  'log-out-outline': 'arrow-path',
  'warning-outline': 'exclamation-triangle',
  'key-outline': 'document-text',
  'person-add-outline': 'users',
  'create-outline': 'document-text',
  'remove-circle-outline': 'x-mark',
  'checkmark-circle-outline': 'check-circle',
  'business-outline': 'building-office-2',
  'swap-horizontal-outline': 'arrow-right',
  'cube-outline': 'cube',
  'swap-vertical-outline': 'arrow-right',
  'arrow-forward-outline': 'arrow-right',
  'resize-outline': 'cube',
  'lock-closed-outline': 'document-text',
  'lock-open-outline': 'document-text',
  'file-tray-full-outline': 'inbox',
  'close-circle-outline': 'x-mark',
  'arrow-back-outline': 'arrow-right',
  'ban-outline': 'x-mark',
  'checkmark-done-outline': 'check-circle',
  'close-outline': 'x-mark',
  'download-outline': 'arrow-right',
  'send-outline': 'arrow-right',
  'construct-outline': 'cube',
  'checkmark-outline': 'check-circle',
  'trash-outline': 'x-mark',
  'storefront-outline': 'building-office-2',
  'shield-checkmark-outline': 'check-circle',
  'people-outline': 'users',
  'time-outline': 'clock',
};

export function getActivityIconName(configIcon: string): IconName {
  return ACTIVITY_ICON_MAP[configIcon] ?? 'document-text';
}
