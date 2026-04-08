import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { RequestCurrentUser } from '../auth/request-current-user';
import { CreateDirectChatRequestDto } from '../dto/request/create-direct-chat.request.dto';
import { CreateGroupChatRequestDto } from '../dto/request/create-group-chat.request.dto';
import { RenameChatRequestDto } from '../dto/request/rename-chat.request.dto';
import { ChatResponseDto } from '../dto/response/chat.response.dto';
import { CurrentUser } from '../domain/current-user';
import { ChatsService } from '../services/chats.service';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  async getChats(@RequestCurrentUser() currentUser: CurrentUser): Promise<ChatResponseDto[]> {
    const chats = await this.chatsService.getUserChats(currentUser);
    return chats.map((chat) => ChatResponseDto.fromDomain(chat));
  }

  @Get(':chatId')
  async getChatById(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatsService.getChatById(currentUser, chatId);
    return ChatResponseDto.fromDomain(chat);
  }

  @Patch(':chatId')
  async renameChat(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: RenameChatRequestDto,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatsService.renameGroupChat(currentUser, {
      chatId,
      name: body.name,
    });

    return ChatResponseDto.fromDomain(chat);
  }

  @Post('direct')
  @HttpCode(200)
  async createOrGetDirectChat(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Body() body: CreateDirectChatRequestDto,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatsService.createDirectChat(currentUser, {
      email: body.email,
    });

    return ChatResponseDto.fromDomain(chat);
  }

  @Post('group')
  async createGroupChat(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Body() body: CreateGroupChatRequestDto,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatsService.createGroupChat(currentUser, {
      name: body.name,
      memberEmails: body.memberEmails,
    });

    return ChatResponseDto.fromDomain(chat);
  }

  @Delete(':chatId')
  @HttpCode(204)
  async deleteGroupChat(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<void> {
    await this.chatsService.deleteGroupChat(currentUser, { chatId });
  }

  @Post(':chatId/leave')
  @HttpCode(204)
  async leaveGroupChat(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<void> {
    await this.chatsService.leaveGroupChat(currentUser, { chatId });
  }
}
