import { Injectable } from '@nestjs/common';

import { ChatsDao, CreateChatDaoInput } from '../contracts/dao';
import { ChatMemberRole, ChatType } from '../domain/enums';
import { Chat, ChatMember, User } from '../domain/models';
import { PrismaService } from '../prisma/prisma.service';

type PrismaChatRecord = {
  id: number;
  name: string | null;
  type: 'DIRECT' | 'GROUP';
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
  constructor(private readonly prisma: PrismaService) {}

  async listByUserId(userId: number): Promise<Chat[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    return chats.map((chat) => this.mapChat(chat as PrismaChatRecord));
  }

  async findById(chatId: number): Promise<Chat | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    return chat ? this.mapChat(chat as PrismaChatRecord) : null;
  }

  async findAccessibleById(chatId: number, userId: number): Promise<Chat | null> {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    return chat ? this.mapChat(chat as PrismaChatRecord) : null;
  }

  async findDirectChatBetweenUsers(firstUserId: number, secondUserId: number): Promise<Chat | null> {
    const chat = await this.prisma.chat.findFirst({
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
        members: {
          include: {
            user: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    return chat ? this.mapChat(chat as PrismaChatRecord) : null;
  }

  async create(input: CreateChatDaoInput): Promise<Chat> {
    const chat = await this.prisma.chat.create({
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
        members: {
          include: {
            user: true,
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    return this.mapChat(chat as PrismaChatRecord);
  }

  async delete(chatId: number): Promise<void> {
    await this.prisma.chat.delete({
      where: { id: chatId },
    });
  }

  async removeMember(chatId: number, userId: number): Promise<void> {
    await this.prisma.chatMember.deleteMany({
      where: {
        chatId,
        userId,
      },
    });
  }

  private mapChat(chat: PrismaChatRecord): Chat {
    return {
      id: chat.id,
      name: chat.name,
      type: chat.type as ChatType,
      members: chat.members.map((member) => this.mapMember(member)),
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
}
