import { Module } from '@nestjs/common';

import { PrismaChatsDao } from './dao/prisma-chats.dao';
import { PrismaMessagesDao } from './dao/prisma-messages.dao';
import { PrismaUsersDao } from './dao/prisma-users.dao';
import { CHATS_DAO, MESSAGES_DAO, USERS_DAO } from './contracts/tokens';
import { PrismaModule } from './prisma/prisma.module';
import { ChatsService } from './services/chats.service';
import { MessagesService } from './services/messages.service';
import { UsersService } from './services/users.service';

@Module({
  imports: [PrismaModule],
  providers: [
    UsersService,
    ChatsService,
    MessagesService,
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
  ],
  exports: [UsersService, ChatsService, MessagesService],
})
export class AppModule {}
