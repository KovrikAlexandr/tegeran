import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AuthGuard } from './auth/auth.guard';
import { AuthIdentityService } from './auth/auth-identity.service';
import { ChatsController } from './controllers/chats.controller';
import { ChatMembersController } from './controllers/chat-members.controller';
import { HealthController } from './controllers/health.controller';
import { MeController } from './controllers/me.controller';
import { MessagesController } from './controllers/messages.controller';
import { PrismaChatsDao } from './dao/prisma-chats.dao';
import { PrismaMessagesDao } from './dao/prisma-messages.dao';
import { PrismaUsersDao } from './dao/prisma-users.dao';
import { CHATS_DAO, MESSAGES_DAO, USERS_DAO } from './contracts/tokens';
import { ChatMembersHttpFacade } from './facades/chat-members-http.facade';
import { DomainExceptionFilter } from './filters/domain-exception.filter';
import { HttpLoggingInterceptor } from './logging/http-logging.interceptor';
import { JsonLogger } from './logging/json-logger.service';
import { PrismaModule } from './prisma/prisma.module';
import { ChatsService } from './services/chats.service';
import { MessagesService } from './services/messages.service';
import { UsersService } from './services/users.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, MeController, ChatsController, ChatMembersController, MessagesController],
  providers: [
    UsersService,
    ChatsService,
    MessagesService,
    AuthIdentityService,
    ChatMembersHttpFacade,
    {
      provide: USERS_DAO,
      useClass: PrismaUsersDao,
    },
    {
      provide: CHATS_DAO,
      useClass: PrismaChatsDao,
    },
    {
      provide: MESSAGES_DAO,
      useClass: PrismaMessagesDao,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
  exports: [UsersService, ChatsService, MessagesService],
})
export class AppModule {}
