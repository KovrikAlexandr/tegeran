import { Inject, Injectable } from '@nestjs/common';

import { CreateLocalUserInput, GetOrCreateCurrentUserInput } from '../contracts/commands';
import { UsersDao } from '../contracts/dao';
import { UsersServiceContract } from '../contracts/services';
import { USERS_DAO } from '../contracts/tokens';
import { User } from '../domain/models';
import { JsonLogger } from '../logging/json-logger.service';

@Injectable()
export class UsersService implements UsersServiceContract {
  constructor(
    @Inject(USERS_DAO) private readonly usersDao: UsersDao,
    private readonly logger: JsonLogger = new JsonLogger(),
  ) {}

  getByAuthSubject(authSubject: string): Promise<User | null> {
    this.logger.debug('Looking up user by authSubject', 'UsersService', { authSubject });
    return this.usersDao.findByAuthSubject(authSubject);
  }

  async getOrCreateCurrentUser(input: GetOrCreateCurrentUserInput): Promise<User> {
    this.logger.debug('Resolving current local user', 'UsersService', {
      authSubject: input.currentUser.authSubject,
    });
    const existing = await this.usersDao.findByAuthSubject(input.currentUser.authSubject);

    if (existing) {
      this.logger.info('Resolved existing local user', 'UsersService', {
        authSubject: existing.authSubject,
        userId: existing.id,
      });
      return existing;
    }

    const user = await this.usersDao.create({
      authSubject: input.currentUser.authSubject,
      name: input.name,
      email: input.email,
    });

    this.logger.info('Created local user', 'UsersService', {
      authSubject: user.authSubject,
      userId: user.id,
    });

    return user;
  }

  createLocalUser(input: CreateLocalUserInput): Promise<User> {
    this.logger.info('Creating local user', 'UsersService', {
      authSubject: input.authSubject,
      email: input.email,
    });
    return this.usersDao.create(input);
  }

  getById(id: number): Promise<User | null> {
    this.logger.debug('Looking up user by id', 'UsersService', { userId: id });
    return this.usersDao.findById(id);
  }

  getByEmail(email: string): Promise<User | null> {
    this.logger.debug('Looking up user by email', 'UsersService', { email });
    return this.usersDao.findByEmail(email);
  }
}
