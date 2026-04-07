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
import { requireCurrentUser } from './current-user-resolver';

@Injectable()
export class ChatsService implements ChatsServiceContract {
  constructor(
    @Inject(USERS_DAO) private readonly usersDao: UsersDao,
    @Inject(CHATS_DAO) private readonly chatsDao: ChatsDao,
  ) {}

  async getUserChats(currentUser: CurrentUser): Promise<Chat[]> {
    const user = await requireCurrentUser(this.usersDao, currentUser);
    return this.chatsDao.listByUserId(user.id);
  }

  async getChatById(currentUser: CurrentUser, chatId: number): Promise<Chat> {
    const chat = await this.getAccessibleChat(currentUser, chatId);
    return chat;
  }

  async createDirectChat(currentUser: CurrentUser, input: CreateDirectChatInput): Promise<Chat> {
    const user = await requireCurrentUser(this.usersDao, currentUser);

    if (user.id === input.peerUserId) {
      throw new BusinessRuleError('Direct chat requires two different users');
    }

    const peer = await this.usersDao.findById(input.peerUserId);

    if (!peer) {
      throw new NotFoundError(`User with id "${input.peerUserId}" was not found`);
    }

    const existingChat = await this.chatsDao.findDirectChatBetweenUsers(user.id, input.peerUserId);

    if (existingChat) {
      throw new ConflictError('Direct chat already exists for this pair of users');
    }

    return this.chatsDao.create({
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
  }

  async createGroupChat(currentUser: CurrentUser, input: CreateGroupChatInput): Promise<Chat> {
    const user = await requireCurrentUser(this.usersDao, currentUser);
    const name = input.name.trim();

    if (!name) {
      throw new BusinessRuleError('Group chat name is required');
    }

    const memberUserIds = [...new Set(input.memberUserIds)].filter((memberUserId) => memberUserId !== user.id);

    for (const memberUserId of memberUserIds) {
      const member = await this.usersDao.findById(memberUserId);

      if (!member) {
        throw new NotFoundError(`User with id "${memberUserId}" was not found`);
      }
    }

    return this.chatsDao.create({
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
  }

  async deleteGroupChat(currentUser: CurrentUser, input: DeleteGroupChatInput): Promise<void> {
    const { chat, currentMember } = await this.getAccessibleChatWithCurrentMember(currentUser, input.chatId);

    if (chat.type === ChatType.DIRECT) {
      throw new BusinessRuleError('Direct chat cannot be deleted');
    }

    if (currentMember.role !== ChatMemberRole.OWNER) {
      throw new AccessDeniedError('Only group owner can delete group chat');
    }

    await this.chatsDao.delete(chat.id);
  }

  async leaveGroupChat(currentUser: CurrentUser, input: LeaveGroupChatInput): Promise<void> {
    const { chat, currentMember } = await this.getAccessibleChatWithCurrentMember(currentUser, input.chatId);

    if (chat.type === ChatType.DIRECT) {
      throw new BusinessRuleError('Cannot leave direct chat');
    }

    if (currentMember.role === ChatMemberRole.OWNER) {
      throw new BusinessRuleError('Group owner cannot leave the chat');
    }

    await this.chatsDao.removeMember(chat.id, currentMember.userId);
  }

  async getChatMembers(currentUser: CurrentUser, chatId: number) {
    const chat = await this.getAccessibleChat(currentUser, chatId);
    return chat.members;
  }

  async removeGroupMember(currentUser: CurrentUser, input: RemoveGroupMemberInput): Promise<void> {
    const { chat, currentMember } = await this.getAccessibleChatWithCurrentMember(currentUser, input.chatId);

    if (chat.type === ChatType.DIRECT) {
      throw new BusinessRuleError('Cannot remove members from direct chat');
    }

    if (currentMember.role !== ChatMemberRole.OWNER) {
      throw new AccessDeniedError('Only group owner can remove members');
    }

    const targetMember = chat.members.find((member) => member.userId === input.memberUserId);

    if (!targetMember) {
      throw new NotFoundError(`User with id "${input.memberUserId}" is not a member of chat "${chat.id}"`);
    }

    if (targetMember.role === ChatMemberRole.OWNER) {
      throw new BusinessRuleError('Group owner cannot be removed from chat');
    }

    await this.chatsDao.removeMember(chat.id, targetMember.userId);
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
