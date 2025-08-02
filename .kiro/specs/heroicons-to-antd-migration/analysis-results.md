# Heroicons Usage Analysis Results

## Components Requiring Migration

### 1. ProjectCollaborationDashboard.tsx
**Heroicons Used:**
- `UsersIcon` → `TeamOutlined`
- `DocumentTextIcon` → `FileTextOutlined`
- `ClockIcon` → `ClockCircleOutlined`
- `CheckCircleIcon` → `CheckCircleOutlined`
- `ExclamationCircleIcon` → `ExclamationCircleOutlined`
- `ChartBarIcon` → `BarChartOutlined`
- `CalendarDaysIcon` → `CalendarOutlined`
- `UserCircleIcon` → `UserOutlined`
- `ArrowPathIcon` → `ReloadOutlined`

### 2. WorkflowStepNavigation.tsx
**Heroicons Used:**
- `ChevronLeftIcon` → `LeftOutlined`
- `ChevronRightIcon` → `RightOutlined`
- `CheckCircleIcon` → `CheckCircleOutlined`
- `ClockIcon` → `ClockCircleOutlined`
- `CheckCircleIconSolid` → `CheckCircleFilled`

### 3. DocumentEditor.tsx (Partially Migrated)
**Heroicons Used:**
- `CheckIcon` → `CheckOutlined`
- `XMarkIcon` → `CloseOutlined`
- `EyeIcon` → `EyeOutlined`
- `EyeSlashIcon` → `EyeInvisibleOutlined`
- `DocumentTextIcon` → `FileTextOutlined`
- `ClockIcon` → `ClockCircleOutlined`
- `ExclamationTriangleIcon` → `ExclamationTriangleOutlined`
- `ArrowPathIcon` → `ReloadOutlined`

### 4. ConflictAnalysisPanel.tsx
**Heroicons Used:**
- `ExclamationTriangleIcon` → `ExclamationTriangleOutlined`
- `DocumentTextIcon` → `FileTextOutlined`
- `ClockIcon` → `ClockCircleOutlined`

### 5. DocumentManager.tsx (Partially Migrated)
**Heroicons Used:**
- `PencilIcon` → `EditOutlined`
- `EyeIcon` → `EyeOutlined`
- `CheckIcon` → `CheckOutlined`
- `XMarkIcon` → `CloseOutlined`
- `DocumentTextIcon` → `FileTextOutlined`
- `ClockIcon` → `ClockCircleOutlined`
- `ExclamationTriangleIcon` → `ExclamationTriangleOutlined`
- `ArrowUpIcon` → `ArrowUpOutlined`
- `DocumentDuplicateIcon` → `CopyOutlined`

### 6. Breadcrumb.tsx
**Heroicons Used:**
- `HomeIcon` → `HomeOutlined`
- `ChevronRightIcon` → `RightOutlined`
- `DocumentIcon` → `FileOutlined`
- `CogIcon` → `SettingOutlined`

### 7. AIChatPanel.tsx (Partially Migrated)
**Heroicons Used:**
- `PaperAirplaneIcon` → `SendOutlined`
- `ArrowPathIcon` → `ReloadOutlined`
- `ChatBubbleLeftRightIcon` → `MessageOutlined`
- `LightBulbIcon` → `BulbOutlined`
- `DocumentTextIcon` → `FileTextOutlined`
- `ExclamationTriangleIcon` → `ExclamationTriangleOutlined`
- `ClockIcon` → `ClockCircleOutlined`
- `EllipsisVerticalIcon` → `MoreOutlined`
- `ArrowDownTrayIcon` → `DownloadOutlined`

### 8. ProjectCard.tsx
**Heroicons Used:**
- `UsersIcon` → `TeamOutlined`
- `DocumentTextIcon` → `FileTextOutlined`
- `ClockIcon` → `ClockCircleOutlined`
- `ChevronRightIcon` → `RightOutlined`

### 9. AIPMHeader.tsx
**Heroicons Used:**
- `Bars3Icon` → `MenuOutlined`
- `BellIcon` → `BellOutlined`
- `UserCircleIcon` → `UserOutlined`
- `ArrowLeftIcon` → `LeftOutlined`

### 10. WorkflowGuide.tsx
**Heroicons Used:**
- `InformationCircleIcon` → `InfoCircleOutlined`
- `CheckCircleIcon` → `CheckCircleOutlined`
- `ExclamationTriangleIcon` → `ExclamationTriangleOutlined`
- `ClockIcon` → `ClockCircleOutlined`

### 11. ConversationHistoryPanel.tsx (Partially Migrated)
**Heroicons Used:**
- `ClockIcon` → `ClockCircleOutlined`
- `MagnifyingGlassIcon` → `SearchOutlined`
- `FunnelIcon` → `FilterOutlined`
- `DocumentArrowDownIcon` → `FileDownloadOutlined`
- `EyeIcon` → `EyeOutlined`
- `ChatBubbleLeftRightIcon` → `MessageOutlined`
- `CalendarDaysIcon` → `CalendarOutlined`
- `ChartBarIcon` → `BarChartOutlined`
- `XMarkIcon` → `CloseOutlined`
- `ArrowDownTrayIcon` → `DownloadOutlined`
- `ArchiveBoxIcon` → `InboxOutlined`

### 12. WorkflowProgress.tsx
**Heroicons Used:**
- `CheckCircleIcon` → `CheckCircleOutlined`
- `ClockIcon` → `ClockCircleOutlined`
- `ExclamationTriangleIcon` → `ExclamationTriangleOutlined`
- `ArrowRightIcon` → `RightOutlined`

### 13. CreateProjectModal.tsx
**Heroicons Used:**
- `XMarkIcon` → `CloseOutlined`

### 14. WorkflowSidebar.tsx
**Heroicons Used:**
- `DocumentTextIcon` → `FileTextOutlined`
- `UsersIcon` → `TeamOutlined`
- `ChatBubbleLeftRightIcon` → `MessageOutlined`
- `ChartBarIcon` → `BarChartOutlined`
- `CheckCircleIcon` → `CheckCircleOutlined`
- `ClockIcon` → `ClockCircleOutlined`

### 15. DocumentVersionHistory.tsx
**Heroicons Used:**
- `ClockIcon` → `ClockCircleOutlined`
- `UserIcon` → `UserOutlined`
- `XMarkIcon` → `CloseOutlined`

## Summary

**Total Components:** 15
**Total Unique Icons:** 25
**Most Used Icons:**
1. `ClockIcon` (9 components)
2. `DocumentTextIcon` (7 components)
3. `CheckCircleIcon` (6 components)
4. `ExclamationTriangleIcon` (6 components)
5. `XMarkIcon` (5 components)

## Migration Priority

**High Priority (Core Components):**
1. DocumentEditor.tsx
2. DocumentManager.tsx
3. AIChatPanel.tsx
4. ConversationHistoryPanel.tsx

**Medium Priority (Navigation/UI):**
1. WorkflowStepNavigation.tsx
2. WorkflowSidebar.tsx
3. AIPMHeader.tsx
4. Breadcrumb.tsx

**Low Priority (Dashboard/Auxiliary):**
1. ProjectCollaborationDashboard.tsx
2. ProjectCard.tsx
3. WorkflowGuide.tsx
4. WorkflowProgress.tsx
5. ConflictAnalysisPanel.tsx
6. CreateProjectModal.tsx
7. DocumentVersionHistory.tsx