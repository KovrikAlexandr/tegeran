import { Injectable } from '@nestjs/common';

import { UsersDao } from '../contracts/dao';
import { User } from '../domain/models';
import { JsonLogger } from '../logging/json-logger.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaUsersDao implements UsersDao {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: JsonLogger = new JsonLogger(),
  ) {}

  async findByAuthSubject(authSubject: string): Promise<User | null> {
    const user = await this.runQuery('findByAuthSubject', { authSubject }, () =>
      this.prisma.user.findUnique({
        where: { authSubject },
      }),
    );

    return user ? this.mapUser(user) : null;
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.runQuery('findById', { id }, () =>
      this.prisma.user.findUnique({
        where: { id },
      }),
    );

    return user ? this.mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.runQuery('findByEmail', { email }, () =>
      this.prisma.user.findUnique({
        where: { email },
      }),
    );

    return user ? this.mapUser(user) : null;
  }

  async create(input: { authSubject: string; name: string; email: string }): Promise<User> {
    const user = await this.runQuery('create', { authSubject: input.authSubject, email: input.email }, () =>
      this.prisma.user.create({
        data: input,
      }),
    );

    return this.mapUser(user);
  }

  private async runQuery<T>(
    operation: string,
    metadata: Record<string, unknown>,
    callback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      this.logger.error('Prisma users DAO operation failed', 'PrismaUsersDao', {
        operation,
        ...metadata,
        error,
      });
      throw error;
    }
  }

  private mapUser(user: { id: number; authSubject: string; name: string; email: string }): User {
    return {
      id: user.id,
      authSubject: user.authSubject,
      name: user.name,
      email: user.email,
    };
  }
}
