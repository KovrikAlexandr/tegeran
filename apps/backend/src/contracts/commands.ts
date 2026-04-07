import { CurrentUser } from '../domain/current-user';
import { Chat, ChatMember, Message, User } from '../domain/models';

export interface CreateLocalUserInput {
  authSubject: string;
  name: string;
  email: string;
}

export interface GetOrCreateCurrentUserInput {
  currentUser: CurrentUser;
  name: string;
  email: string;
}

export interface CreateDirectChatInput {
  peerUserId: number;
}

export interface CreateGroupChatInput {
  name: string;
  memberUserIds: number[];
}

export interface DeleteGroupChatInput {
  chatId: number;
}

export interface LeaveGroupChatInput {
  chatId: number;
}

export interface RemoveGroupMemberInput {
  chatId: number;
  memberUserId: number;
}

export interface SendMessageInput {
  chatId: number;
  content: string;
}

export type UserOutput = User;
export type ChatOutput = Chat;
export type ChatMembersOutput = ChatMember[];
export type MessagesOutput = Message[];
