import { Inject, Injectable } from '@nestjs/common';

import {
  CreateDirectChatInput,
  CreateGroupChatInput,
  DeleteGroupChatInput,
  LeaveGroupChatInput,
  RemoveGroupMemberInput,
} from '../contracts/commands';
import { ChatsDao, UsersDao } from '../contracts/dao';
import { ChatsServiceContract } from '../contracts/services';
import { CHATS_DAO, USERS_DAO } from '../contracts/tokens';
import { CurrentUser } from '../domain/current-user';
import { AccessDeniedError, BusinessRuleError, ConflictError, NotFoundError } from '../domain/errors';
import { ChatMemberRole, ChatType } from '../domain/enums';
import { Chat } from '../domain/models';
import { JsonLogger } from '../logging/json-logger.service';
import { requireCurrentUser } from './current-user-resolver';

@Injectable()
export class ChatsService implements ChatsServiceContract {
  constructor(
    @Inject(USERS_DAO) private readonly usersDao: UsersDao,
    @Inject(CHATS_DAO) private readonly chatsDao: ChatsDao,
    private readonly logger: JsonLogger = new JsonLogger(),
  ) {}

  async getUserChats(currentUser: CurrentUser): Promise<Chat[]> {
    this.logger.debug('Fetching user chats', 'ChatsService', {
      authSubject: currentUser.authSubject,
    });
    const user = await requireCurrentUser(this.usersDao, currentUser);
    return this.chatsDao.listByUserId(user.id);
  }

  async getChatById(currentUser: CurrentUser, chatId: number): Promise<Chat> {
    this.logger.debug('Fetching chat by id', 'ChatsService', {
      authSubject: currentUser.authSubject,
      chatId,
    });
    const chat = await this.getAccessibleChat(currentUser, chatId);
    return chat;
  }

  async createDirectChat(currentUser: CurrentUser, input: CreateDirectChatInput): Promise<Chat> {
    this.logger.debug('Attempting to create direct chat', 'ChatsService', {
      authSubject: currentUser.authSubject,
      peerUserId: input.peerUserId,
    });
    const user = await requireCurrentUser(this.usersDao, currentUser);

    if (user.id === input.peerUserId) {
      this.logger.warning('Rejected direct chat creation for same user', 'ChatsService', {
        userId: user.id,
      });
      throw new BusinessRuleError('Direct chat requires two different users');
    }

    const peer = await this.usersDao.findById(input.peerUserId);

    if (!peer) {
      throw new NotFoundError(`User with id "${input.peerUserId}" was not found`);
    }

    const existingChat = await this.chatsDao.findDirectChatBetweenUsers(user.id, input.peerUserId);

    if (existingChat) {
      this.logger.warning('Rejected duplicate direct chat creation', 'ChatsService', {
        userId: user.id,
        peerUserId: input.peerUserId,
        chatId: existingChat.id,
      });
      throw new ConflictError('Direct chat already exists for this pair of users');
    }

    const chat = await this.chatsDao.create({
      name: null,
      type: ChatType.DIRECT,
      members: [
        {
          userId: user.id,
          role: ChatMemberRole.MEMBER,
        },
        {
          userId: peer.id,
          role: ChatMemberRole.MEMBER,
        },
      ],
    });

    this.logger.info('Direct chat created', 'ChatsService', {
      chatId: chat.id,
      initiatorUserId: user.id,
      peerUserId: peer.id,
    });

    return chat;
  }

  async createGroupChat(currentUser: CurrentUser, input: CreateGroupChatInput): Promise<Chat> {
    this.logger.debug('Attempting to create group chat', 'ChatsService', {
      authSubject: currentUser.authSubject,
      requestedMemberCount: input.memberUserIds.length,
    });
    const user = await requireCurrentUser(this.usersDao, currentUser);
    const name = input.name.trim();

    if (!name) {
      this.logger.warning('Rejected group chat creation without name', 'ChatsService', {
        userId: user.id,
      });
      throw new BusinessRuleError('Group chat name is required');
    }

    const memberUserIds = [...new Set(input.memberUserIds)].filter((memberUserId) => memberUserId !== user.id);

    for (const memberUserId of memberUserIds) {
      const member = await this.usersDao.findById(memberUserId);

      if (!member) {
        throw new NotFoundError(`User with id "${memberUserId}" was not found`);
      }
    }

    const chat = await this.chatsDao.create({
      name,
      type: ChatType.GROUP,
      members: [
        {
          userId: user.id,
          role: ChatMemberRole.OWNER,
        },
        ...memberUserIds.map((memberUserId) => ({
          userId: memberUserId,
          role: ChatMemberRole.MEMBER,
        })),
      ],
    });

    this.logger.info('Group chat created', 'ChatsService', {
      chatId: chat.id,
      ownerUserId: user.id,
      memberCount: chat.members.length,
    });

    return chat;
  }

  async deleteGroupChat(currentUser: CurrentUser, input: DeleteGroupChatInput): Promise<void> {
    this.logger.debug('Attempting to delete group chat', 'ChatsService', {
      authSubject: currentUser.authSubject,
      chatId: input.chatId,
    });
    const { chat, currentMember } = await this.getAccessibleChatWithCurrentMember(currentUser, input.chatId);

    if (chat.type === ChatType.DIRECT) {
      this.logger.warning('Rejected direct chat deletion', 'ChatsService', {
        chatId: chat.id,
        userId: currentMember.userId,
      });
      throw new BusinessRuleError('Direct chat cannot be deleted');
    }

    if (currentMember.role !== ChatMemberRole.OWNER) {
      this.logger.warning('Rejected group chat deletion by non-owner', 'ChatsService', {
        chatId: chat.id,
        userId: currentMember.userId,
      });
      throw new AccessDeniedError('Only group owner can delete group chat');
    }

    await this.chatsDao.delete(chat.id);
    this.logger.info('Group chat deleted', 'ChatsService', {
      chatId: chat.id,
      ownerUserId: currentMember.userId,
    });
  }

  async leaveGroupChat(currentUser: CurrentUser, input: LeaveGroupChatInput): Promise<void> {
    this.logger.debug('Attempting to leave group chat', 'ChatsService', {
      authSubject: currentUser.authSubject,
      chatId: input.chatId,
    });
    const { chat, currentMember } = await this.getAccessibleChatWithCurrentMember(currentUser, input.chatId);

    if (chat.type === ChatType.DIRECT) {
      this.logger.warning('Rejected attempt to leave direct chat', 'ChatsService', {
        chatId: chat.id,
        userId: currentMember.userId,
      });
      throw new BusinessRuleError('Cannot leave direct chat');
    }

    if (currentMember.role === ChatMemberRole.OWNER) {
      this.logger.warning('Rejected owner leave operation', 'ChatsService', {
        chatId: chat.id,
        userId: currentMember.userId,
      });
      throw new BusinessRuleError('Group owner cannot leave the chat');
    }

    await this.chatsDao.removeMember(chat.id, currentMember.userId);
    this.logger.info('User left group chat', 'ChatsService', {
      chatId: chat.id,
      userId: currentMember.userId,
    });
  }

  async getChatMembers(currentUser: CurrentUser, chatId: number) {
    this.logger.debug('Fetching chat members', 'ChatsService', {
      authSubject: currentUser.authSubject,
      chatId,
    });
    const chat = await this.getAccessibleChat(currentUser, chatId);
    return chat.members;
  }

  async removeGroupMember(currentUser: CurrentUser, input: RemoveGroupMemberInput): Promise<void> {
    this.logger.debug('Attempting to remove group member', 'ChatsService', {
      authSubject: currentUser.authSubject,
      chatId: input.chatId,
      memberUserId: input.memberUserId,
    });
    const { chat, currentMember } = await this.getAccessibleChatWithCurrentMember(currentUser, input.chatId);

    if (chat.type === ChatType.DIRECT) {
      this.logger.warning('Rejected member removal from direct chat', 'ChatsService', {
        chatId: chat.id,
        userId: currentMember.userId,
      });
      throw new BusinessRuleError('Cannot remove members from direct chat');
    }

    if (currentMember.role !== ChatMemberRole.OWNER) {
      this.logger.warning('Rejected member removal by non-owner', 'ChatsService', {
        chatId: chat.id,
        userId: currentMember.userId,
        memberUserId: input.memberUserId,
      });
      throw new AccessDeniedError('Only group owner can remove members');
    }

    const targetMember = chat.members.find((member) => member.userId === input.memberUserId);

    if (!targetMember) {
      this.logger.warning('Rejected removal of non-member', 'ChatsService', {
        chatId: chat.id,
        memberUserId: input.memberUserId,
      });
      throw new NotFoundError(`User with id "${input.memberUserId}" is not a member of chat "${chat.id}"`);
    }

    if (targetMember.role === ChatMemberRole.OWNER) {
      this.logger.warning('Rejected owner removal from group chat', 'ChatsService', {
        chatId: chat.id,
        memberUserId: targetMember.userId,
      });
      throw new BusinessRuleError('Group owner cannot be removed from chat');
    }

    await this.chatsDao.removeMember(chat.id, targetMember.userId);
    this.logger.info('Group member removed', 'ChatsService', {
      chatId: chat.id,
      removedUserId: targetMember.userId,
      ownerUserId: currentMember.userId,
    });
  }

  private async getAccessibleChat(currentUser: CurrentUser, chatId: number): Promise<Chat> {
    const user = await requireCurrentUser(this.usersDao, currentUser);
    const chat = await this.chatsDao.findAccessibleById(chatId, user.id);

    if (!chat) {
      throw new NotFoundError(`Chat with id "${chatId}" was not found`);
    }

    return chat;
  }

  private async getAccessibleChatWithCurrentMember(currentUser: CurrentUser, chatId: number) {
    const user = await requireCurrentUser(this.usersDao, currentUser);
    const chat = await this.chatsDao.findAccessibleById(chatId, user.id);

    if (!chat) {
      throw new NotFoundError(`Chat with id "${chatId}" was not found`);
    }

    const currentMember = chat.members.find((member) => member.userId === user.id);

    if (!currentMember) {
      throw new NotFoundError(`Current user is not a member of chat "${chatId}"`);
    }

    return { chat, currentMember };
  }
}
