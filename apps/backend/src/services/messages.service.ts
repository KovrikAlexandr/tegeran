import { Inject, Injectable } from '@nestjs/common';

import { SendMessageInput } from '../contracts/commands';
import { ChatsDao, MessagesDao, UsersDao } from '../contracts/dao';
import { MessagesServiceContract } from '../contracts/services';
import { CHATS_DAO, MESSAGES_DAO, USERS_DAO } from '../contracts/tokens';
import { CurrentUser } from '../domain/current-user';
import { NotFoundError } from '../domain/errors';
import { Message, User } from '../domain/models';
import { requireCurrentUser } from './current-user-resolver';

@Injectable()
export class MessagesService implements MessagesServiceContract {
  constructor(
    @Inject(USERS_DAO) private readonly usersDao: UsersDao,
    @Inject(CHATS_DAO) private readonly chatsDao: ChatsDao,
    @Inject(MESSAGES_DAO) private readonly messagesDao: MessagesDao,
  ) {}

  async getChatHistory(currentUser: CurrentUser, chatId: number): Promise<Message[]> {
    await this.getAccessibleUser(currentUser, chatId);
    return this.messagesDao.listByChatId(chatId);
  }

  async sendMessage(currentUser: CurrentUser, input: SendMessageInput): Promise<Message> {
    const user = await this.getAccessibleUser(currentUser, input.chatId);

    return this.messagesDao.create({
      chatId: input.chatId,
      senderId: user.id,
      content: input.content,
    });
  }

  private async getAccessibleUser(currentUser: CurrentUser, chatId: number): Promise<User> {
    const user = await requireCurrentUser(this.usersDao, currentUser);
    const chat = await this.chatsDao.findAccessibleById(chatId, user.id);

    if (!chat) {
      throw new NotFoundError(`Chat with id "${chatId}" was not found`);
    }

    return user;
  }
}
