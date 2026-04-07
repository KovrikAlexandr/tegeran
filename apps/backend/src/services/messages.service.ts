import { Inject, Injectable } from '@nestjs/common';

import { SendMessageInput } from '../contracts/commands';
import { ChatsDao, MessagesDao, UsersDao } from '../contracts/dao';
import { MessagesServiceContract } from '../contracts/services';
import { CHATS_DAO, MESSAGES_DAO, USERS_DAO } from '../contracts/tokens';
import { CurrentUser } from '../domain/current-user';
import { NotFoundError } from '../domain/errors';
import { Message, User } from '../domain/models';
import { JsonLogger } from '../logging/json-logger.service';
import { requireCurrentUser } from './current-user-resolver';

@Injectable()
export class MessagesService implements MessagesServiceContract {
  constructor(
    @Inject(USERS_DAO) private readonly usersDao: UsersDao,
    @Inject(CHATS_DAO) private readonly chatsDao: ChatsDao,
    @Inject(MESSAGES_DAO) private readonly messagesDao: MessagesDao,
    private readonly logger: JsonLogger = new JsonLogger(),
  ) {}

  async getChatHistory(currentUser: CurrentUser, chatId: number): Promise<Message[]> {
    this.logger.debug('Fetching chat history', 'MessagesService', {
      authSubject: currentUser.authSubject,
      chatId,
    });
    await this.getAccessibleUser(currentUser, chatId);
    return this.messagesDao.listByChatId(chatId);
  }

  async sendMessage(currentUser: CurrentUser, input: SendMessageInput): Promise<Message> {
    this.logger.debug('Attempting to send message', 'MessagesService', {
      authSubject: currentUser.authSubject,
      chatId: input.chatId,
    });
    const user = await this.getAccessibleUser(currentUser, input.chatId);

    const message = await this.messagesDao.create({
      chatId: input.chatId,
      senderId: user.id,
      content: input.content,
    });

    this.logger.info('Message sent', 'MessagesService', {
      chatId: input.chatId,
      senderId: user.id,
      messageId: message.id,
    });

    return message;
  }

  private async getAccessibleUser(currentUser: CurrentUser, chatId: number): Promise<User> {
    const user = await requireCurrentUser(this.usersDao, currentUser);
    const chat = await this.chatsDao.findAccessibleById(chatId, user.id);

    if (!chat) {
      this.logger.warning('Rejected chat access for non-member', 'MessagesService', {
        authSubject: currentUser.authSubject,
        chatId,
      });
      throw new NotFoundError(`Chat with id "${chatId}" was not found`);
    }

    return user;
  }
}
