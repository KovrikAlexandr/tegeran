import { ChatLastMessage } from '../../domain/models';

export class ChatLastMessageResponseDto {
  content!: string;
  createdAt!: string;

  static fromDomain(message: ChatLastMessage): ChatLastMessageResponseDto {
    return {
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
