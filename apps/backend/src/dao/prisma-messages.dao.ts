import { Injectable } from '@nestjs/common';

import { MessagesDao } from '../contracts/dao';
import { Message } from '../domain/models';
import { JsonLogger } from '../logging/json-logger.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaMessagesDao implements MessagesDao {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: JsonLogger = new JsonLogger(),
  ) {}

  async listByChatId(chatId: number): Promise<Message[]> {
    const messages = await this.runQuery('listByChatId', { chatId }, () =>
      this.prisma.message.findMany({
        where: { chatId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );

    return messages.map((message) => this.mapMessage(message));
  }

  async create(input: { chatId: number; senderId: number; content: string }): Promise<Message> {
    const message = await this.runQuery('create', { chatId: input.chatId, senderId: input.senderId }, () =>
      this.prisma.message.create({
        data: input,
      }),
    );

    return this.mapMessage(message);
  }

  private async runQuery<T>(
    operation: string,
    metadata: Record<string, unknown>,
    callback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      this.logger.error('Prisma messages DAO operation failed', 'PrismaMessagesDao', {
        operation,
        ...metadata,
        error,
      });
      throw error;
    }
  }

  private mapMessage(message: {
    id: number;
    content: string;
    senderId: number;
    chatId: number;
    createdAt: Date;
  }): Message {
    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      chatId: message.chatId,
      createdAt: message.createdAt,
    };
  }
}
