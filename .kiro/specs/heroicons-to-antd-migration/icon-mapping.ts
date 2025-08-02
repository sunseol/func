/**
 * Icon Mapping Configuration
 * Maps Heroicons to their Ant Design equivalents
 */

export interface IconMapping {
  heroicon: string;
  antdIcon: string;
  size?: 'small' | 'default' | 'large';
  customStyle?: React.CSSProperties;
  notes?: string;
}

export const ICON_MAPPINGS: Record<string, IconMapping> = {
  // Navigation Icons
  'ChevronLeftIcon': {
    heroicon: 'ChevronLeftIcon',
    antdIcon: 'LeftOutlined',
    size: 'default'
  },
  'ChevronRightIcon': {
    heroicon: 'ChevronRightIcon',
    antdIcon: 'RightOutlined',
    size: 'default'
  },
  'ArrowLeftIcon': {
    heroicon: 'ArrowLeftIcon',
    antdIcon: 'LeftOutlined',
    size: 'default'
  },
  'ArrowRightIcon': {
    heroicon: 'ArrowRightIcon',
    antdIcon: 'RightOutlined',
    size: 'default'
  },
  'ArrowUpIcon': {
    heroicon: 'ArrowUpIcon',
    antdIcon: 'ArrowUpOutlined',
    size: 'default'
  },
  'HomeIcon': {
    heroicon: 'HomeIcon',
    antdIcon: 'HomeOutlined',
    size: 'default'
  },

  // Action Icons
  'PlusIcon': {
    heroicon: 'PlusIcon',
    antdIcon: 'PlusOutlined',
    size: 'default'
  },
  'TrashIcon': {
    heroicon: 'TrashIcon',
    antdIcon: 'DeleteOutlined',
    size: 'default'
  },
  'PencilIcon': {
    heroicon: 'PencilIcon',
    antdIcon: 'EditOutlined',
    size: 'default'
  },
  'CheckIcon': {
    heroicon: 'CheckIcon',
    antdIcon: 'CheckOutlined',
    size: 'default'
  },
  'XMarkIcon': {
    heroicon: 'XMarkIcon',
    antdIcon: 'CloseOutlined',
    size: 'default'
  },
  'ArrowPathIcon': {
    heroicon: 'ArrowPathIcon',
    antdIcon: 'ReloadOutlined',
    size: 'default'
  },
  'DocumentDuplicateIcon': {
    heroicon: 'DocumentDuplicateIcon',
    antdIcon: 'CopyOutlined',
    size: 'default'
  },
  'ArrowDownTrayIcon': {
    heroicon: 'ArrowDownTrayIcon',
    antdIcon: 'DownloadOutlined',
    size: 'default'
  },
  'PaperAirplaneIcon': {
    heroicon: 'PaperAirplaneIcon',
    antdIcon: 'SendOutlined',
    size: 'default'
  },

  // Status Icons
  'CheckCircleIcon': {
    heroicon: 'CheckCircleIcon',
    antdIcon: 'CheckCircleOutlined',
    size: 'default'
  },
  'CheckCircleIconSolid': {
    heroicon: 'CheckCircleIconSolid',
    antdIcon: 'CheckCircleFilled',
    size: 'default',
    notes: 'Solid version from @heroicons/react/24/solid'
  },
  'ExclamationCircleIcon': {
    heroicon: 'ExclamationCircleIcon',
    antdIcon: 'ExclamationCircleOutlined',
    size: 'default'
  },
  'ExclamationTriangleIcon': {
    heroicon: 'ExclamationTriangleIcon',
    antdIcon: 'ExclamationTriangleOutlined',
    size: 'default'
  },
  'InformationCircleIcon': {
    heroicon: 'InformationCircleIcon',
    antdIcon: 'InfoCircleOutlined',
    size: 'default'
  },
  'ClockIcon': {
    heroicon: 'ClockIcon',
    antdIcon: 'ClockCircleOutlined',
    size: 'default'
  },

  // Document Icons
  'DocumentTextIcon': {
    heroicon: 'DocumentTextIcon',
    antdIcon: 'FileTextOutlined',
    size: 'default'
  },
  'DocumentIcon': {
    heroicon: 'DocumentIcon',
    antdIcon: 'FileOutlined',
    size: 'default'
  },
  'DocumentArrowDownIcon': {
    heroicon: 'DocumentArrowDownIcon',
    antdIcon: 'FileDownloadOutlined',
    size: 'default'
  },

  // User Icons
  'UsersIcon': {
    heroicon: 'UsersIcon',
    antdIcon: 'TeamOutlined',
    size: 'default'
  },
  'UserIcon': {
    heroicon: 'UserIcon',
    antdIcon: 'UserOutlined',
    size: 'default'
  },
  'UserCircleIcon': {
    heroicon: 'UserCircleIcon',
    antdIcon: 'UserOutlined',
    size: 'default'
  },

  // View Icons
  'EyeIcon': {
    heroicon: 'EyeIcon',
    antdIcon: 'EyeOutlined',
    size: 'default'
  },
  'EyeSlashIcon': {
    heroicon: 'EyeSlashIcon',
    antdIcon: 'EyeInvisibleOutlined',
    size: 'default'
  },

  // Communication Icons
  'ChatBubbleLeftRightIcon': {
    heroicon: 'ChatBubbleLeftRightIcon',
    antdIcon: 'MessageOutlined',
    size: 'default'
  },
  'BellIcon': {
    heroicon: 'BellIcon',
    antdIcon: 'BellOutlined',
    size: 'default'
  },

  // Interface Icons
  'Bars3Icon': {
    heroicon: 'Bars3Icon',
    antdIcon: 'MenuOutlined',
    size: 'default'
  },
  'EllipsisVerticalIcon': {
    heroicon: 'EllipsisVerticalIcon',
    antdIcon: 'MoreOutlined',
    size: 'default'
  },
  'MagnifyingGlassIcon': {
    heroicon: 'MagnifyingGlassIcon',
    antdIcon: 'SearchOutlined',
    size: 'default'
  },
  'FunnelIcon': {
    heroicon: 'FunnelIcon',
    antdIcon: 'FilterOutlined',
    size: 'default'
  },
  'CogIcon': {
    heroicon: 'CogIcon',
    antdIcon: 'SettingOutlined',
    size: 'default'
  },

  // Chart/Data Icons
  'ChartBarIcon': {
    heroicon: 'ChartBarIcon',
    antdIcon: 'BarChartOutlined',
    size: 'default'
  },
  'CalendarDaysIcon': {
    heroicon: 'CalendarDaysIcon',
    antdIcon: 'CalendarOutlined',
    size: 'default'
  },

  // Misc Icons
  'LightBulbIcon': {
    heroicon: 'LightBulbIcon',
    antdIcon: 'BulbOutlined',
    size: 'default'
  },
  'ArchiveBoxIcon': {
    heroicon: 'ArchiveBoxIcon',
    antdIcon: 'InboxOutlined',
    size: 'default'
  }
};

/**
 * Get Ant Design icon name for a given Heroicon
 */
export function getAntdIcon(heroicon: string): string {
  const mapping = ICON_MAPPINGS[heroicon];
  if (!mapping) {
    console.warn(`No mapping found for Heroicon: ${heroicon}`);
    return 'QuestionCircleOutlined'; // Fallback icon
  }
  return mapping.antdIcon;
}

/**
 * Get all Heroicons that need to be migrated
 */
export function getAllHeroicons(): string[] {
  return Object.keys(ICON_MAPPINGS);
}

/**
 * Get migration statistics
 */
export function getMigrationStats() {
  const totalIcons = Object.keys(ICON_MAPPINGS).length;
  const categories = {
    navigation: ['ChevronLeftIcon', 'ChevronRightIcon', 'ArrowLeftIcon', 'ArrowRightIcon', 'ArrowUpIcon', 'HomeIcon'].length,
    action: ['PlusIcon', 'TrashIcon', 'PencilIcon', 'CheckIcon', 'XMarkIcon', 'ArrowPathIcon', 'DocumentDuplicateIcon', 'ArrowDownTrayIcon', 'PaperAirplaneIcon'].length,
    status: ['CheckCircleIcon', 'CheckCircleIconSolid', 'ExclamationCircleIcon', 'ExclamationTriangleIcon', 'InformationCircleIcon', 'ClockIcon'].length,
    document: ['DocumentTextIcon', 'DocumentIcon', 'DocumentArrowDownIcon'].length,
    user: ['UsersIcon', 'UserIcon', 'UserCircleIcon'].length,
    view: ['EyeIcon', 'EyeSlashIcon'].length,
    communication: ['ChatBubbleLeftRightIcon', 'BellIcon'].length,
    interface: ['Bars3Icon', 'EllipsisVerticalIcon', 'MagnifyingGlassIcon', 'FunnelIcon', 'CogIcon'].length,
    chart: ['ChartBarIcon', 'CalendarDaysIcon'].length,
    misc: ['LightBulbIcon', 'ArchiveBoxIcon'].length
  };

  return {
    totalIcons,
    categories
  };
}