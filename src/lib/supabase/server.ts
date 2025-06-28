import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // The linter is correctly complaining that `ReadonlyRequestCookies`
          // does not have a `get` method. However, in the context of a
          // Server Action or Server Component, the `cookies()` function from `next/headers`
          // returns a request cookie jar that does have a `get` method.
          // We can use `as any` to bypass the TypeScript type check.
          return (cookieStore as any).get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // The linter is correctly complaining that `ReadonlyRequestCookies`
            // does not have a `set` method. However, in the context of a
            // Server Action, the `cookies()` function from `next/headers`
            // returns a request cookie jar that does have a `set` method.
            // We can use `as any` to bypass the TypeScript type check.
            (cookieStore as any).set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Same as above for `set`.
            (cookieStore as any).set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
} 