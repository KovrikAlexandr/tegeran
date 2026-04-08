import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';

import { RequestCurrentUser } from '../auth/request-current-user';
import { AddChatMemberRequestDto } from '../dto/request/add-chat-member.request.dto';
import { RemoveChatMemberByEmailRequestDto } from '../dto/request/remove-chat-member-by-email.request.dto';
import { ChatMemberResponseDto } from '../dto/response/chat-member.response.dto';
import { CurrentUser } from '../domain/current-user';
import { ChatMembersHttpFacade } from '../facades/chat-members-http.facade';
import { ChatsService } from '../services/chats.service';

@Controller('chats/:chatId/members')
export class ChatMembersController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly chatMembersHttpFacade: ChatMembersHttpFacade,
  ) {}

  @Get()
  async getChatMembers(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<ChatMemberResponseDto[]> {
    const members = await this.chatsService.getChatMembers(currentUser, chatId);
    return members.map((member) => ChatMemberResponseDto.fromDomain(member));
  }

  @Post()
  async addChatMember(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: AddChatMemberRequestDto,
  ): Promise<ChatMemberResponseDto> {
    const member = await this.chatMembersHttpFacade.addMember(currentUser, chatId, body.userId);
    return ChatMemberResponseDto.fromDomain(member);
  }

  @Delete('by-email')
  @HttpCode(204)
  async removeChatMemberByEmail(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: RemoveChatMemberByEmailRequestDto,
  ): Promise<void> {
    await this.chatsService.removeGroupMemberByEmail(currentUser, {
      chatId,
      email: body.email,
    });
  }

  @Delete(':userId')
  @HttpCode(204)
  async removeChatMember(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    await this.chatsService.removeGroupMember(currentUser, {
      chatId,
      memberUserId: userId,
    });
  }
}
