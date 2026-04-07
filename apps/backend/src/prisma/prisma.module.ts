import { Global, Module } from '@nestjs/common';

import { JsonLogger } from '../logging/json-logger.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [JsonLogger, PrismaService],
  exports: [JsonLogger, PrismaService],
})
export class PrismaModule {}
