import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    const error = {
      message: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };

    const builder: any = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => builder,
      single: () => builder,
      limit: () => builder,
      order: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      upsert: () => builder,
      in: () => builder,
      then: (resolve: (value: { data: null; error: typeof error }) => unknown) =>
        Promise.resolve({ data: null, error }).then(resolve),
    };

    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error }),
        updateUser: async () => ({ data: { user: null }, error }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        resetPasswordForEmail: async () => ({ data: null, error }),
        resend: async () => ({ data: null, error }),
        refreshSession: async () => ({ data: { session: null }, error }),
      },
      from: () => builder,
      rpc: () => builder,
      channel: () => ({
        on: () => ({
          subscribe: () => ({ unsubscribe() {} }),
        }),
      }),
      removeChannel: () => {},
    } as any;
  }

  return createBrowserClient(url, key)
} 
