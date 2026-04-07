import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/client';
import { JsonLogger } from '../logging/json-logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: JsonLogger = new JsonLogger()) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.logger.info('Connecting Prisma client', 'PrismaService');
    await this.$connect();
    this.logger.info('Prisma client connected', 'PrismaService');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.info('Disconnecting Prisma client', 'PrismaService');
    await this.$disconnect();
    this.logger.info('Prisma client disconnected', 'PrismaService');
  }
}
