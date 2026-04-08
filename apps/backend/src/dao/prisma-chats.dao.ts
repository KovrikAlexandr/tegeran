import { Injectable } from '@nestjs/common';

import { ChatsDao, CreateChatDaoInput } from '../contracts/dao';
import { ChatMemberRole, ChatType } from '../domain/enums';
import { Chat, ChatLastMessage, ChatMember, User } from '../domain/models';
import { JsonLogger } from '../logging/json-logger.service';
import { PrismaService } from '../prisma/prisma.service';

type PrismaChatRecord = {
  id: number;
  name: string | null;
  type: 'DIRECT' | 'GROUP';
  messages?: Array<{
    content: string;
    createdAt: Date;
  }>;
  members: Array<{
    id: number;
    chatId: number;
    userId: number;
    role: 'OWNER' | 'MEMBER';
    user: {
      id: number;
      authSubject: string;
      name: string;
      email: string;
    };
  }>;
};

@Injectable()
export class PrismaChatsDao implements ChatsDao {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: JsonLogger = new JsonLogger(),
  ) {}

  async listByUserId(userId: number): Promise<Chat[]> {
    const chats = await this.runQuery('listByUserId', { userId }, () =>
      this.prisma.chat.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        include: {
          messages: {
            select: {
              content: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
          members: {
            include: {
              user: true,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
      }),
    );

    return chats
      .map((chat) => this.mapChat(chat as PrismaChatRecord))
      .sort((left, right) => this.compareChatsByLastMessage(left, right));
  }

  async findById(chatId: number): Promise<Chat | null> {
    const chat = await this.runQuery('findById', { chatId }, () =>
      this.prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: {
            select: {
              content: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
          members: {
            include: {
              user: true,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
      }),
    );

    return chat ? this.mapChat(chat as PrismaChatRecord) : null;
  }

  async findAccessibleById(chatId: number, userId: number): Promise<Chat | null> {
    const chat = await this.runQuery('findAccessibleById', { chatId, userId }, () =>
      this.prisma.chat.findFirst({
        where: {
          id: chatId,
          members: {
            some: { userId },
          },
        },
        include: {
          messages: {
            select: {
              content: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
          members: {
            include: {
              user: true,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
      }),
    );

    return chat ? this.mapChat(chat as PrismaChatRecord) : null;
  }

  async findDirectChatBetweenUsers(firstUserId: number, secondUserId: number): Promise<Chat | null> {
    const chat = await this.runQuery('findDirectChatBetweenUsers', { firstUserId, secondUserId }, () =>
      this.prisma.chat.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            {
              members: {
                some: { userId: firstUserId },
              },
            },
            {
              members: {
                some: { userId: secondUserId },
              },
            },
            {
              members: {
                every: {
                  userId: {
                    in: [firstUserId, secondUserId],
                  },
                },
              },
            },
          ],
        },
        include: {
          messages: {
            select: {
              content: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
          members: {
            include: {
              user: true,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
      }),
    );

    return chat ? this.mapChat(chat as PrismaChatRecord) : null;
  }

  async create(input: CreateChatDaoInput): Promise<Chat> {
    const chat = await this.runQuery(
      'create',
      { type: input.type, memberUserIds: input.members.map((member) => member.userId) },
      () =>
        this.prisma.chat.create({
          data: {
            name: input.name,
            type: input.type,
            members: {
              create: input.members.map((member) => ({
                userId: member.userId,
                role: member.role,
              })),
            },
          },
          include: {
            messages: {
              select: {
                content: true,
                createdAt: true,
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: 1,
            },
            members: {
              include: {
                user: true,
              },
              orderBy: {
                id: 'asc',
              },
            },
          },
        }),
    );

    return this.mapChat(chat as PrismaChatRecord);
  }

  async updateName(chatId: number, name: string): Promise<Chat> {
    const chat = await this.runQuery('updateName', { chatId, name }, () =>
      this.prisma.chat.update({
        where: { id: chatId },
        data: { name },
        include: {
          messages: {
            select: {
              content: true,
              createdAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
          members: {
            include: {
              user: true,
            },
            orderBy: {
              id: 'asc',
            },
          },
        },
      }),
    );

    return this.mapChat(chat as PrismaChatRecord);
  }

  async addMember(chatId: number, userId: number, role: ChatMemberRole): Promise<void> {
    await this.runQuery('addMember', { chatId, userId, role }, () =>
      this.prisma.chatMember.create({
        data: {
          chatId,
          userId,
          role,
        },
      }),
    );
  }

  async delete(chatId: number): Promise<void> {
    await this.runQuery('delete', { chatId }, () =>
      this.prisma.chat.delete({
        where: { id: chatId },
      }),
    );
  }

  async removeMember(chatId: number, userId: number): Promise<void> {
    await this.runQuery('removeMember', { chatId, userId }, () =>
      this.prisma.chatMember.deleteMany({
        where: {
          chatId,
          userId,
        },
      }),
    );
  }

  private async runQuery<T>(
    operation: string,
    metadata: Record<string, unknown>,
    callback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      this.logger.error('Prisma chats DAO operation failed', 'PrismaChatsDao', {
        operation,
        ...metadata,
        error,
      });
      throw error;
    }
  }

  private mapChat(chat: PrismaChatRecord): Chat {
    return {
      id: chat.id,
      name: chat.name,
      type: chat.type as ChatType,
      members: chat.members.map((member) => this.mapMember(member)),
      lastMessage: this.mapLastMessage(chat.messages),
    };
  }

  private mapLastMessage(messages?: PrismaChatRecord['messages']): ChatLastMessage | null {
    const message = messages?.[0];

    if (!message) {
      return null;
    }

    return {
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  private mapMember(member: PrismaChatRecord['members'][number]): ChatMember {
    return {
      id: member.id,
      chatId: member.chatId,
      userId: member.userId,
      role: member.role as ChatMemberRole,
      user: this.mapUser(member.user),
    };
  }

  private mapUser(user: PrismaChatRecord['members'][number]['user']): User {
    return {
      id: user.id,
      authSubject: user.authSubject,
      name: user.name,
      email: user.email,
    };
  }

  private compareChatsByLastMessage(left: Chat, right: Chat): number {
    const leftTimestamp = left.lastMessage?.createdAt.getTime() ?? Number.NEGATIVE_INFINITY;
    const rightTimestamp = right.lastMessage?.createdAt.getTime() ?? Number.NEGATIVE_INFINITY;

    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    return right.id - left.id;
  }
}
