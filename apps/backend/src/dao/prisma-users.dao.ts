import { Injectable } from '@nestjs/common';

import { UsersDao } from '../contracts/dao';
import { User } from '../domain/models';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaUsersDao implements UsersDao {
  constructor(private readonly prisma: PrismaService) {}

  async findByAuthSubject(authSubject: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { authSubject },
    });

    return user ? this.mapUser(user) : null;
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapUser(user) : null;
  }

  async create(input: { authSubject: string; name: string; email: string }): Promise<User> {
    const user = await this.prisma.user.create({
      data: input,
    });

    return this.mapUser(user);
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
