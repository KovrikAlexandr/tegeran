import { Inject, Injectable } from '@nestjs/common';

import { ChatsDao } from '../contracts/dao';
import { CHATS_DAO } from '../contracts/tokens';
import { CurrentUser } from '../domain/current-user';
import { ChatMemberRole } from '../domain/enums';
import { AccessDeniedError, BusinessRuleError, ConflictError, NotFoundError } from '../domain/errors';
import { ChatMember } from '../domain/models';
import { ChatsService } from '../services/chats.service';
import { UsersService } from '../services/users.service';

@Injectable()
export class ChatMembersHttpFacade {
  constructor(
    private readonly usersService: UsersService,
    private readonly chatsService: ChatsService,
    @Inject(CHATS_DAO) private readonly chatsDao: ChatsDao,
  ) {}

  async addMember(currentUser: CurrentUser, chatId: number, memberUserId: number): Promise<ChatMember> {
    const currentLocalUser = await this.usersService.getByAuthSubject(currentUser.authSubject);

    if (!currentLocalUser) {
      throw new NotFoundError(`Current user with authSubject "${currentUser.authSubject}" was not found`);
    }

    const chat = await this.chatsService.getChatById(currentUser, chatId);

    if (chat.type !== 'GROUP') {
      throw new BusinessRuleError('Members can only be added to group chats');
    }

    const members = await this.chatsService.getChatMembers(currentUser, chatId);
    const requesterMember = members.find((member) => member.userId === currentLocalUser.id);

    if (!requesterMember) {
      throw new NotFoundError(`Current user is not a member of chat "${chatId}"`);
    }

    if (requesterMember.role !== ChatMemberRole.OWNER) {
      throw new AccessDeniedError('Only group owner can add members');
    }

    const targetUser = await this.usersService.getById(memberUserId);

    if (!targetUser) {
      throw new NotFoundError(`User with id "${memberUserId}" was not found`);
    }

    if (members.some((member) => member.userId === memberUserId)) {
      throw new ConflictError(`User with id "${memberUserId}" is already a member of chat "${chatId}"`);
    }

    await this.chatsDao.addMember(chatId, memberUserId, ChatMemberRole.MEMBER);

    const updatedMembers = await this.chatsService.getChatMembers(currentUser, chatId);
    const addedMember = updatedMembers.find((member) => member.userId === memberUserId);

    if (!addedMember) {
      throw new NotFoundError(`User with id "${memberUserId}" was not added to chat "${chatId}"`);
    }

    return addedMember;
  }
}
