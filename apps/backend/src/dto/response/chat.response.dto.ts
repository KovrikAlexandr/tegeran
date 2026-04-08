import { Chat } from '../../domain/models';

import { ChatMemberResponseDto } from './chat-member.response.dto';
import { ChatLastMessageResponseDto } from './chat-last-message.response.dto';

export class ChatResponseDto {
  id!: number;
  name!: string | null;
  type!: string;
  members!: ChatMemberResponseDto[];
  lastMessage!: ChatLastMessageResponseDto | null;

  static fromDomain(chat: Chat): ChatResponseDto {
    return {
      id: chat.id,
      name: chat.name,
      type: chat.type,
      members: chat.members.map((member) => ChatMemberResponseDto.fromDomain(member)),
      lastMessage: chat.lastMessage ? ChatLastMessageResponseDto.fromDomain(chat.lastMessage) : null,
    };
  }
}
