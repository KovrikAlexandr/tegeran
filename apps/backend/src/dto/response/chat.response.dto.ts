import { Chat } from '../../domain/models';

import { ChatMemberResponseDto } from './chat-member.response.dto';

export class ChatResponseDto {
  id!: number;
  name!: string | null;
  type!: string;
  members!: ChatMemberResponseDto[];

  static fromDomain(chat: Chat): ChatResponseDto {
    return {
      id: chat.id,
      name: chat.name,
      type: chat.type,
      members: chat.members.map((member) => ChatMemberResponseDto.fromDomain(member)),
    };
  }
}
