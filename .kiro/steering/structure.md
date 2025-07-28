# Project Structure

## Root Directory
```
├── .env.local              # Environment variables (not in git)
├── .env.local.example      # Environment template
├── package.json            # Dependencies and scripts
├── next.config.mjs         # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── supabase-schema*.sql    # Database schema files
└── scripts/                # Utility scripts (admin management)
```

## Source Structure (`src/`)

### App Directory (`src/app/`)
Following Next.js App Router conventions:

```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Home page (main report form)
├── globals.css             # Global styles
├── favicon.ico             # App icon
├── login/page.tsx          # Authentication pages
├── signup/page.tsx
├── my-reports/page.tsx     # User report management
├── admin/page.tsx          # Admin dashboard
├── api/grop.ts             # API route for GROQ integration
└── components/             # Shared UI components
    ├── InputForm.tsx       # Report input form
    ├── ResultDisplay.tsx   # Report preview/display
    ├── RichEditor.tsx      # Markdown editor
    ├── WeeklyReportForm.tsx # Weekly report form
    └── ThemeProvider.tsx   # Theme context provider
```

### Supporting Directories
```
src/
├── context/
│   └── AuthContext.tsx     # Authentication state management
├── lib/
│   └── supabase/           # Supabase client configuration
│       ├── client.ts       # Client-side Supabase client
│       └── server.ts       # Server-side Supabase client
└── middleware.ts           # Next.js middleware (auth protection)
```

## Naming Conventions

### Files & Directories
- **Pages**: `page.tsx` (App Router convention)
- **Components**: PascalCase (e.g., `InputForm.tsx`)
- **Utilities**: camelCase (e.g., `createClient.ts`)
- **Directories**: kebab-case for routes, camelCase for others

### Database
- **Tables**: snake_case (e.g., `user_profiles`, `daily_reports`)
- **Columns**: snake_case (e.g., `created_at`, `user_id`)

### Code Style
- **Components**: PascalCase with descriptive names
- **Functions**: camelCase with verb-noun pattern
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase with descriptive suffixes

## Key Architectural Decisions

### Client vs Server Components
- **Server Components**: Pages, data fetching, authentication checks
- **Client Components**: Interactive UI, state management, event handlers
- **Hybrid**: Components that need both server data and client interactivity

### State Management
- **Global State**: React Context (Auth, Theme)
- **Local State**: useState for component-specific state
- **Server State**: Supabase real-time subscriptions where needed

### Routing & Navigation
- **File-based Routing**: Next.js App Router
- **Protected Routes**: Middleware-based authentication
- **Dynamic Routes**: Not currently used, but structure supports `[id]` patterns

### Data Flow
- **Authentication**: Context → Components
- **Database**: Supabase client → Components
- **AI Integration**: API routes → Client components
- **Theme**: Context → All components