import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { RequestCurrentUser } from '../auth/request-current-user';
import { SendMessageRequestDto } from '../dto/request/send-message.request.dto';
import { MessageResponseDto } from '../dto/response/message.response.dto';
import { CurrentUser } from '../domain/current-user';
import { MessagesService } from '../services/messages.service';

@Controller('chats/:chatId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async getMessages(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messagesService.getChatHistory(currentUser, chatId);
    return messages.map((message) => MessageResponseDto.fromDomain(message));
  }

  @Post()
  async sendMessage(
    @RequestCurrentUser() currentUser: CurrentUser,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: SendMessageRequestDto,
  ): Promise<MessageResponseDto> {
    const message = await this.messagesService.sendMessage(currentUser, {
      chatId,
      content: body.content,
    });

    return MessageResponseDto.fromDomain(message);
  }
}
