import { persistUserRole } from './role-update';

describe('persistUserRole', () => {
  it('requires the database response to confirm the requested role', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'user-1', role: 'admin' },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const eq = jest.fn(() => ({ select }));
    const update = jest.fn(() => ({ eq }));
    const client = { from: jest.fn(() => ({ update })) };

    await expect(persistUserRole(client, 'user-1', 'admin')).resolves.toEqual({
      id: 'user-1',
      role: 'admin',
    });
    expect(update).toHaveBeenCalledWith({
      role: 'admin',
      updated_at: expect.any(String),
    });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(select).toHaveBeenCalledWith('id, role');
  });

  it('rejects a successful PATCH that does not return the requested role', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: 'user-1', role: 'user' },
      error: null,
    });
    const client = {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({ single })),
          })),
        })),
      })),
    };

    await expect(persistUserRole(client, 'user-1', 'admin')).rejects.toThrow(
      'Database did not confirm the requested role change.',
    );
  });
});
