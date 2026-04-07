import { Inject, Injectable } from '@nestjs/common';

import { CreateLocalUserInput, GetOrCreateCurrentUserInput } from '../contracts/commands';
import { UsersDao } from '../contracts/dao';
import { UsersServiceContract } from '../contracts/services';
import { USERS_DAO } from '../contracts/tokens';
import { User } from '../domain/models';

@Injectable()
export class UsersService implements UsersServiceContract {
  constructor(@Inject(USERS_DAO) private readonly usersDao: UsersDao) {}

  getByAuthSubject(authSubject: string): Promise<User | null> {
    return this.usersDao.findByAuthSubject(authSubject);
  }

  async getOrCreateCurrentUser(input: GetOrCreateCurrentUserInput): Promise<User> {
    const existing = await this.usersDao.findByAuthSubject(input.currentUser.authSubject);

    if (existing) {
      return existing;
    }

    return this.usersDao.create({
      authSubject: input.currentUser.authSubject,
      name: input.name,
      email: input.email,
    });
  }

  createLocalUser(input: CreateLocalUserInput): Promise<User> {
    return this.usersDao.create(input);
  }

  getById(id: number): Promise<User | null> {
    return this.usersDao.findById(id);
  }

  getByEmail(email: string): Promise<User | null> {
    return this.usersDao.findByEmail(email);
  }
}
