import {
  Squares2X2Icon,
  CubeIcon,
  InboxIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  UsersIcon,
  BellIcon,
  Bars3Icon,
  UserCircleIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  SwatchIcon,
  WrenchScrewdriverIcon,
  ChartBarSquareIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  ArrowsRightLeftIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  DocumentPlusIcon,
  CloudArrowUpIcon,
  PhoneIcon,
  PlusIcon,
  MinusIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  QuestionMarkCircleIcon,
  MinusCircleIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  PhotoIcon,
  CameraIcon,
  XCircleIcon,
  BookOpenIcon,
  TruckIcon,
  ArrowsPointingOutIcon,
  SquaresPlusIcon,
} from '@heroicons/react/24/outline';
import type { SVGProps } from 'react';
import { clsx } from 'clsx';

/** Icon names supported by the central Icon component. Add new icons here as needed. */
export type IconName =
  | 'squares-2x2'
  | 'cube'
  | 'inbox'
  | 'document-text'
  | 'building-office-2'
  | 'users'
  | 'bell'
  | 'bars-3'
  | 'user-circle'
  | 'signal-slash'
  | 'arrow-path'
  | 'chevron-down'
  | 'chevron-right'
  | 'x-mark'
  | 'eye'
  | 'eye-slash'
  | 'clock'
  | 'chart-bar'
  | 'exclamation-triangle'
  | 'check-circle'
  | 'arrow-right'
  | 'funnel'
  | 'magnifying-glass'
  | 'plus-circle'
  | 'pencil-square'
  | 'trash'
  | 'arrow-left'
  | 'arrow-down-tray'
  | 'ellipsis-vertical'
  | 'swatch'
  | 'wrench-screwdriver'
  | 'chart-bar-square'
  | 'building-storefront'
  | 'map-pin'
  | 'arrows-right-left'
  | 'exclamation-circle'
  | 'lock-closed'
  | 'document-plus'
  | 'cloud-arrow-up'
  | 'phone'
  | 'plus'
  | 'minus'
  | 'arrow-top-right-on-square'
  | 'check'
  | 'question-mark-circle'
  | 'minus-circle'
  | 'archive-box'
  | 'arrow-uturn-left'
  | 'photo'
  | 'camera'
  | 'x-circle'
  | 'book-open'
  | 'truck'
  | 'arrows-pointing-out'
  | 'squares-plus';

const iconMap = {
  'squares-2x2': Squares2X2Icon,
  cube: CubeIcon,
  inbox: InboxIcon,
  'document-text': DocumentTextIcon,
  'building-office-2': BuildingOffice2Icon,
  users: UsersIcon,
  bell: BellIcon,
  'bars-3': Bars3Icon,
  'user-circle': UserCircleIcon,
  'signal-slash': SignalSlashIcon,
  'arrow-path': ArrowPathIcon,
  'chevron-down': ChevronDownIcon,
  'chevron-right': ChevronRightIcon,
  'x-mark': XMarkIcon,
  eye: EyeIcon,
  'eye-slash': EyeSlashIcon,
  clock: ClockIcon,
  'chart-bar': ChartBarIcon,
  'exclamation-triangle': ExclamationTriangleIcon,
  'check-circle': CheckCircleIcon,
  'arrow-right': ArrowRightIcon,
  funnel: FunnelIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'plus-circle': PlusCircleIcon,
  'pencil-square': PencilSquareIcon,
  trash: TrashIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-down-tray': ArrowDownTrayIcon,
  'ellipsis-vertical': EllipsisVerticalIcon,
  swatch: SwatchIcon,
  'wrench-screwdriver': WrenchScrewdriverIcon,
  'chart-bar-square': ChartBarSquareIcon,
  'building-storefront': BuildingStorefrontIcon,
  'map-pin': MapPinIcon,
  'arrows-right-left': ArrowsRightLeftIcon,
  'exclamation-circle': ExclamationCircleIcon,
  'lock-closed': LockClosedIcon,
  'document-plus': DocumentPlusIcon,
  'cloud-arrow-up': CloudArrowUpIcon,
  phone: PhoneIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  'arrow-top-right-on-square': ArrowTopRightOnSquareIcon,
  check: CheckIcon,
  'question-mark-circle': QuestionMarkCircleIcon,
  'minus-circle': MinusCircleIcon,
  'archive-box': ArchiveBoxIcon,
  'arrow-uturn-left': ArrowUturnLeftIcon,
  photo: PhotoIcon,
  camera: CameraIcon,
  'x-circle': XCircleIcon,
  'book-open': BookOpenIcon,
  truck: TruckIcon,
  'arrows-pointing-out': ArrowsPointingOutIcon,
  'squares-plus': SquaresPlusIcon,
} as const;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  className?: string;
}

/**
 * Central Icon component using Heroicons.
 * Use this for all iconography — never emojis.
 */
export function Icon({ name, className, ...props }: IconProps) {
  const Component = iconMap[name];
  if (!Component) {
    return null;
  }
  return (
    <Component
      className={clsx('flex-shrink-0', className)}
      aria-hidden
      {...props}
    />
  );
}
