# Technology Stack & Development Guide

## Core Technologies

### Frontend Framework
- **Next.js 15** with App Router
- **React 19** with React Server Components
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Ant Design** for UI components

### Backend & Database
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** (via Supabase) for data storage
- **Supabase SSR** for server-side rendering support

### AI Integration
- **GROQ API** for LLM-powered text generation
- **groq-sdk** for API integration

### Development Tools
- **ESLint** with Next.js config for code linting
- **Jest** with React Testing Library for unit testing
- **Playwright** for end-to-end testing
- **TypeScript** strict mode enabled

### Key Libraries
- `@uiw/react-md-editor` - Rich markdown editor
- `@heroicons/react` - Icon library
- `dayjs` - Date manipulation
- `isomorphic-dompurify` - HTML sanitization
- `cookie` - Cookie handling

## Common Commands

### Development
```bash
npm run dev              # Start development server with Turbo
npm run dev:skip-ts      # Start dev server without TypeScript checking
npm run build            # Production build
npm run start            # Start production server
```

### Testing
```bash
npm run test             # Run Jest unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with UI
npm run test:e2e:debug   # Debug E2E tests
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

## Environment Configuration

### Required Environment Variables
- `NEXT_PUBLIC_GROQ_API_KEY` - GROQ API key for AI features
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Development Settings
- TypeScript strict mode enabled
- ESLint errors ignored during builds (development phase)
- React Strict Mode enabled in development
- Turbo mode for faster development builds

## Performance Optimizations
- Image optimization with WebP/AVIF formats
- Bundle analysis available with `ANALYZE=true npm run build`
- CSS optimization enabled
- Package import optimization for @heroicons/react
- Aggressive caching headers for static assets