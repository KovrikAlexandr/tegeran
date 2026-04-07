import {
  ChatMembersOutput,
  ChatOutput,
  CreateDirectChatInput,
  CreateGroupChatInput,
  CreateLocalUserInput,
  DeleteGroupChatInput,
  GetOrCreateCurrentUserInput,
  LeaveGroupChatInput,
  MessagesOutput,
  RemoveGroupMemberInput,
  SendMessageInput,
  UserOutput,
} from './commands';
import { CurrentUser } from '../domain/current-user';
import { Message } from '../domain/models';

export interface UsersServiceContract {
  getByAuthSubject(authSubject: string): Promise<UserOutput | null>;
  getOrCreateCurrentUser(input: GetOrCreateCurrentUserInput): Promise<UserOutput>;
  createLocalUser(input: CreateLocalUserInput): Promise<UserOutput>;
  getById(id: number): Promise<UserOutput | null>;
  getByEmail(email: string): Promise<UserOutput | null>;
}

export interface ChatsServiceContract {
  getUserChats(currentUser: CurrentUser): Promise<ChatOutput[]>;
  getChatById(currentUser: CurrentUser, chatId: number): Promise<ChatOutput>;
  createDirectChat(currentUser: CurrentUser, input: CreateDirectChatInput): Promise<ChatOutput>;
  createGroupChat(currentUser: CurrentUser, input: CreateGroupChatInput): Promise<ChatOutput>;
  deleteGroupChat(currentUser: CurrentUser, input: DeleteGroupChatInput): Promise<void>;
  leaveGroupChat(currentUser: CurrentUser, input: LeaveGroupChatInput): Promise<void>;
  getChatMembers(currentUser: CurrentUser, chatId: number): Promise<ChatMembersOutput>;
  removeGroupMember(currentUser: CurrentUser, input: RemoveGroupMemberInput): Promise<void>;
}

export interface MessagesServiceContract {
  getChatHistory(currentUser: CurrentUser, chatId: number): Promise<MessagesOutput>;
  sendMessage(currentUser: CurrentUser, input: SendMessageInput): Promise<Message>;
}
