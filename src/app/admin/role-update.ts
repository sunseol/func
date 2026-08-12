export type UserRole = 'admin' | 'user';

interface PersistedUserRole {
  id: string;
  role: UserRole;
}

interface UserRoleUpdateQuery {
  update(values: { role: UserRole; updated_at: string }): {
    eq(column: 'id', value: string): {
      select(columns: 'id, role'): {
        single(): Promise<{
          data: { id: string; role: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export interface UserRoleUpdateClient {
  from(table: 'user_profiles'): UserRoleUpdateQuery;
}

export async function persistUserRole(
  client: UserRoleUpdateClient,
  userId: string,
  role: UserRole,
): Promise<PersistedUserRole> {
  const { data, error } = await client
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, role')
    .single();

  if (error) throw error;
  if (!data || data.id !== userId || data.role !== role) {
    throw new Error('Database did not confirm the requested role change.');
  }

  return { id: data.id, role };
}
