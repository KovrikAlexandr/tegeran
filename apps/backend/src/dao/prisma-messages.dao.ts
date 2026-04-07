import { Injectable } from '@nestjs/common';

import { MessagesDao } from '../contracts/dao';
import { Message } from '../domain/models';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaMessagesDao implements MessagesDao {
  constructor(private readonly prisma: PrismaService) {}

  async listByChatId(chatId: number): Promise<Message[]> {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return messages.map((message) => this.mapMessage(message));
  }

  async create(input: { chatId: number; senderId: number; content: string }): Promise<Message> {
    const message = await this.prisma.message.create({
      data: input,
    });

    return this.mapMessage(message);
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
