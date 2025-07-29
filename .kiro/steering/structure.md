# Project Structure & Organization

## Directory Structure

### Root Level
- `src/` - Main application source code
- `e2e/` - End-to-end tests using Playwright
- `database/` - Database schemas and migrations
- `scripts/` - Utility scripts for admin operations
- `public/` - Static assets (images, icons)

### Source Code Organization (`src/`)

#### App Directory (`src/app/`)
Next.js 15 App Router structure:
- `page.tsx` - Route pages
- `layout.tsx` - Layout components
- `loading.tsx` - Loading UI components
- `error.tsx` - Error boundary components
- `not-found.tsx` - 404 page

#### Key Application Routes
- `/` - Main dashboard/home page
- `/login` & `/signup` - Authentication pages
- `/admin` - Admin dashboard
- `/my-reports` - User report management
- `/notifications` - Notification center
- `/ai-pm/` - AI Project Management module
  - `/ai-pm/[projectId]` - Project-specific pages
  - `/ai-pm/[projectId]/workflow/[step]` - Multi-step workflow pages

#### API Routes (`src/app/api/`)
- `/api/groq` - GROQ AI integration
- `/api/ai-pm/` - AI-PM module APIs
  - `chat/` - AI chat functionality
  - `documents/` - Document management
  - `projects/` - Project CRUD operations

#### Components (`src/components/`)
- `ai-pm/` - AI-PM specific components
- `ui/` - Reusable UI components
- `layout/` - Layout-related components
- `dev/` - Development utilities

#### Library Code (`src/lib/`)
- `supabase/` - Database client configuration
- `ai-pm/` - AI-PM business logic
- `security/` - Security utilities (CSRF, validation)

#### Contexts (`src/contexts/`)
- `AuthContext.tsx` - Authentication state
- `NavigationContext.tsx` - Navigation state
- `ToastContext.tsx` - Toast notifications

#### Types (`src/types/`)
- `ai-pm.ts` - AI-PM related TypeScript types

## Naming Conventions

### Files & Directories
- Use kebab-case for directories: `ai-pm/`, `my-reports/`
- Use PascalCase for React components: `AIChatPanel.tsx`
- Use camelCase for utilities and hooks: `useDocumentManager.ts`
- Use lowercase for API routes: `route.ts`

### Components
- Component files should match the component name
- Use descriptive names that indicate purpose
- Group related components in subdirectories

### API Routes
- Follow RESTful conventions where possible
- Use dynamic routes with brackets: `[projectId]`
- Nested routes reflect resource relationships

## Testing Structure

### Unit Tests (`src/**/__tests__/`)
- Co-located with source files
- Use `.test.ts` or `.test.tsx` extensions
- Follow naming pattern: `ComponentName.test.tsx`

### E2E Tests (`e2e/`)
- Use `.spec.ts` extension
- Descriptive test file names: `ai-pm-complete-workflow.spec.ts`
- Shared utilities in `e2e/utils/`
- Test setup in `e2e/setup/`

## Database Structure (`database/`)

### Migrations (`database/migrations/`)
- Numbered migration files: `001_ai_pm_schema.sql`
- Incremental schema changes
- Include rollback instructions in comments

### Seed Data
- `seed-ai-pm-data.sql` - Sample data for development
- `test_schema.sql` - Test database schema

## Configuration Files

### TypeScript
- Path mapping: `@/*` points to `src/*`
- Strict mode enabled
- Next.js plugin configured

### Styling
- Tailwind CSS with dark mode support
- Class-based dark mode: `darkMode: 'class'`
- Content paths configured for `src/app/**/*`

### Testing
- Jest with Next.js integration
- jsdom environment for React components
- Coverage collection from `src/**/*`
- Playwright for E2E with custom reporter

## Development Patterns

### Component Architecture
- Functional components with hooks
- Context providers for global state
- Custom hooks for business logic
- Error boundaries for error handling

### API Design
- RESTful endpoints where appropriate
- Consistent error handling
- Type-safe request/response interfaces
- Middleware for authentication and validation

### State Management
- React Context for global state
- Local state with useState/useReducer
- Custom hooks for complex state logic
- Supabase real-time subscriptions for live data