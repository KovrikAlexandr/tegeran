import { Message } from '../../domain/models';

export class MessageResponseDto {
  id!: number;
  content!: string;
  senderId!: number;
  chatId!: number;
  createdAt!: string;

  static fromDomain(message: Message): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      chatId: message.chatId,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
