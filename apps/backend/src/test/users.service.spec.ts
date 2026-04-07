import { ConflictError, NotFoundError } from '../domain/errors';
import { createBackendTestContext } from './in-memory-daos';

describe('UsersService', () => {
  it('creates a local user for a new authSubject', async () => {
    const context = createBackendTestContext();

    const user = await context.usersService.getOrCreateCurrentUser({
      currentUser: { authSubject: 'kc-1' },
      name: 'Alice',
      email: 'alice@example.com',
    });

    expect(user).toMatchObject({
      id: 1,
      authSubject: 'kc-1',
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('returns an existing local user for the same authSubject', async () => {
    const context = createBackendTestContext();

    const existing = await context.seedUser({
      authSubject: 'kc-1',
      name: 'Alice',
      email: 'alice@example.com',
    });

    const resolved = await context.usersService.getOrCreateCurrentUser({
      currentUser: { authSubject: 'kc-1' },
      name: 'Different Name',
      email: 'different@example.com',
    });

    expect(resolved).toEqual(existing);
  });

  it('finds users by email and id', async () => {
    const context = createBackendTestContext();
    const user = await context.seedUser({
      authSubject: 'kc-1',
      name: 'Alice',
      email: 'alice@example.com',
    });

    await expect(context.usersService.getById(user.id)).resolves.toEqual(user);
    await expect(context.usersService.getByEmail(user.email)).resolves.toEqual(user);
  });

  it('preserves unique email and authSubject constraints in local user creation', async () => {
    const context = createBackendTestContext();

    await context.usersService.createLocalUser({
      authSubject: 'kc-1',
      name: 'Alice',
      email: 'alice@example.com',
    });

    await expect(
      context.usersService.createLocalUser({
        authSubject: 'kc-2',
        name: 'Another Alice',
        email: 'alice@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('returns null for a missing user lookup', async () => {
    const context = createBackendTestContext();

    await expect(context.usersService.getById(999)).resolves.toBeNull();
    await expect(context.usersService.getByAuthSubject('missing')).resolves.toBeNull();
    await expect(context.usersService.getByEmail('missing@example.com')).resolves.toBeNull();
  });
});
