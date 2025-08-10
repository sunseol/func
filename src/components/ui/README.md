# Mobile-Optimized Table Components

This directory contains a comprehensive set of mobile-optimized table components that provide responsive data display with touch-friendly interfaces.

## Components Overview

### 1. ResponsiveTable
The main table component that automatically adapts between desktop table view and mobile card view.

**Features:**
- Automatic responsive switching between table and card layouts
- Column priority system (high/medium/low)
- Mobile card view with expandable details
- Column visibility toggle
- Horizontal scroll with indicators
- Touch-friendly interactions
- Accessibility support

**Usage:**
```tsx
import ResponsiveTable, { TableColumn } from '@/components/ui/ResponsiveTable';

const columns: TableColumn<DataType>[] = [
  {
    key: 'name',
    title: '이름',
    dataIndex: 'name',
    priority: 'high' // Always visible on mobile
  },
  {
    key: 'email',
    title: '이메일',
    dataIndex: 'email',
    priority: 'medium' // Hidden on mobile by default
  }
];

<ResponsiveTable
  columns={columns}
  dataSource={data}
  rowKey="id"
  mobileCardMode
  expandableRows
  showColumnToggle
/>
```

### 2. MobileActionMenu
A responsive action menu that shows as dropdown on desktop and modal on mobile.

**Features:**
- Automatic desktop/mobile switching
- Touch-friendly button sizes (44px minimum)
- Modal interface on mobile with larger touch targets
- Danger action styling
- Keyboard navigation support
- Outside click and escape key handling

**Usage:**
```tsx
import MobileActionMenu, { ActionMenuItem } from '@/components/ui/MobileActionMenu';

const actions: ActionMenuItem[] = [
  {
    key: 'edit',
    label: '수정',
    icon: PencilIcon,
    onClick: () => handleEdit()
  },
  {
    key: 'delete',
    label: '삭제',
    icon: TrashIcon,
    onClick: () => handleDelete(),
    danger: true
  }
];

<MobileActionMenu items={actions} placement="bottom-right" />
```

### 3. MobileTableControls
Mobile-optimized sorting and filtering controls.

**Features:**
- Mobile-friendly sort modal
- Advanced filter modal with multiple input types
- Search functionality
- Result count display
- Touch-optimized buttons

**Usage:**
```tsx
import MobileTableControls, { SortOption, FilterOption } from '@/components/ui/MobileTableControls';

const sortOptions: SortOption[] = [
  { key: 'name', label: '이름' },
  { key: 'date', label: '날짜' }
];

const filterOptions: FilterOption[] = [
  {
    key: 'status',
    label: '상태',
    type: 'select',
    options: [
      { value: 'active', label: '활성' },
      { value: 'inactive', label: '비활성' }
    ]
  }
];

<MobileTableControls
  searchable
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  sortOptions={sortOptions}
  currentSort={currentSort}
  onSortChange={setCurrentSort}
  filterOptions={filterOptions}
  currentFilters={currentFilters}
  onFiltersChange={setCurrentFilters}
/>
```

### 4. TableActionButtons
Utility component for creating mobile-optimized action buttons in tables.

**Features:**
- Automatic switching between individual buttons and menu
- Common action presets (CRUD, document, approval, user)
- Touch-friendly sizing
- Overflow handling

**Usage:**
```tsx
import { createTableActionColumn, ACTION_PRESETS } from '@/components/ui/TableActionButtons';

// Add to table columns
const actionColumn = createTableActionColumn<DataType>(
  ACTION_PRESETS.crud(
    (record) => handleView(record),
    (record) => handleEdit(record),
    (record) => handleDelete(record)
  ),
  { variant: 'auto', maxVisibleButtons: 2 }
);
```

### 5. AdvancedColumnToggle
Enhanced column visibility control with grouping and presets.

**Features:**
- Column grouping
- Priority-based presets
- Mobile modal interface
- Bulk column operations

### 6. AdvancedTableFilters
Comprehensive filtering system with saved filters and presets.

**Features:**
- Saved filter management
- Quick filter buttons
- Filter presets
- Advanced filter modal

## Utility Functions

### table-utils.ts
Provides utility functions for table configuration:

- `applyColumnPriorities()` - Apply priority configuration to columns
- `getDefaultColumnVisibility()` - Get default visibility based on screen size
- `sortColumnsByPriority()` - Sort columns by priority
- `validateMobileTableConfig()` - Validate table configuration for mobile

**Common Column Priorities:**
```tsx
import { COMMON_COLUMN_PRIORITIES } from '@/lib/table-utils';

// Pre-configured priorities for common data types
const columns = applyColumnPriorities(baseColumns, COMMON_COLUMN_PRIORITIES.userTable);
```

## Mobile Optimization Features

### Touch Targets
- Minimum 44px touch targets on mobile
- Larger 56px targets for primary actions
- Adequate spacing between interactive elements

### Responsive Behavior
- Automatic layout switching based on screen size
- Column priority system for mobile display
- Card-based layout for complex data
- Expandable details for secondary information

### Performance
- Efficient rendering with minimal re-renders
- Lazy loading support
- Optimized for mobile devices

### Accessibility
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management

## Testing

Comprehensive test suites are provided for all components:

- `ResponsiveTable.test.tsx` - Tests responsive behavior, column management, and accessibility
- `MobileActionMenu.test.tsx` - Tests desktop/mobile switching, touch targets, and interactions

Run tests with:
```bash
npm test -- --testPathPatterns="ResponsiveTable|MobileActionMenu"
```

## Examples

See `ExampleMobileTable.tsx` for complete usage examples including:
- User management table
- Document management table
- Integration with sorting and filtering
- Action button configurations

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Touch device optimization
- Responsive design breakpoints
- Progressive enhancement approach