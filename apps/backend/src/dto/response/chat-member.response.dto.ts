import { ChatMember } from '../../domain/models';

import { UserResponseDto } from './user.response.dto';

export class ChatMemberResponseDto {
  id!: number;
  chatId!: number;
  userId!: number;
  role!: string;
  user!: UserResponseDto;

  static fromDomain(member: ChatMember): ChatMemberResponseDto {
    return {
      id: member.id,
      chatId: member.chatId,
      userId: member.userId,
      role: member.role,
      user: UserResponseDto.fromDomain(member.user),
    };
  }
}
