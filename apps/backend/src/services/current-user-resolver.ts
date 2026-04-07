import { UsersDao } from '../contracts/dao';
import { CurrentUser } from '../domain/current-user';
import { NotFoundError } from '../domain/errors';
import { User } from '../domain/models';

export async function requireCurrentUser(usersDao: UsersDao, currentUser: CurrentUser): Promise<User> {
  const user = await usersDao.findByAuthSubject(currentUser.authSubject);

  if (!user) {
    throw new NotFoundError(`Current user with authSubject "${currentUser.authSubject}" is not registered`);
  }

  return user;
}
