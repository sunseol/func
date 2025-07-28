# Technology Stack

## Framework & Runtime
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Node.js** runtime environment

## UI & Styling
- **Ant Design 5** - Primary UI component library with React 19 compatibility patch
- **Tailwind CSS 4** - Utility-first CSS framework with dark mode support
- **@uiw/react-md-editor** - Rich markdown editor component

## Backend & Database
- **Supabase** - Backend-as-a-Service for authentication and PostgreSQL database
- **Row Level Security (RLS)** - Database-level security policies
- **Server-Side Rendering** - Supabase SSR package for server components

## AI Integration
- **GROQ API** - LLM service for natural language report generation

## Development Tools
- **TypeScript 5** - Type safety and developer experience
- **ESLint** - Code linting with Next.js configuration
- **Turbopack** - Fast bundler for development

## Common Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Setup
```bash
cp .env.local.example .env.local  # Copy environment template
```

### Required Environment Variables
- `NEXT_PUBLIC_GROQ_API_KEY` - GROQ API key for AI features
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (admin functions)

## Architecture Patterns
- **App Router** - Next.js 13+ file-based routing
- **Server/Client Components** - Hybrid rendering strategy
- **Context Providers** - Global state management (Auth, Theme)
- **Custom Hooks** - Reusable logic extraction
- **Component Composition** - Modular UI architecture