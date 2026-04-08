import { ChatMemberRole, ChatType } from '../domain/enums';
import { Chat, Message, User } from '../domain/models';

export interface CreateChatDaoInput {
  name: string | null;
  type: ChatType;
  members: Array<{
    userId: number;
    role: ChatMemberRole;
  }>;
}

export interface UsersDao {
  findByAuthSubject(authSubject: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: {
    authSubject: string;
    name: string;
    email: string;
  }): Promise<User>;
}

export interface ChatsDao {
  listByUserId(userId: number): Promise<Chat[]>;
  findById(chatId: number): Promise<Chat | null>;
  findAccessibleById(chatId: number, userId: number): Promise<Chat | null>;
  findDirectChatBetweenUsers(firstUserId: number, secondUserId: number): Promise<Chat | null>;
  create(input: CreateChatDaoInput): Promise<Chat>;
  updateName(chatId: number, name: string): Promise<Chat>;
  addMember(chatId: number, userId: number, role: ChatMemberRole): Promise<void>;
  delete(chatId: number): Promise<void>;
  removeMember(chatId: number, userId: number): Promise<void>;
}

export interface MessagesDao {
  listByChatId(chatId: number): Promise<Message[]>;
  create(input: {
    chatId: number;
    senderId: number;
    content: string;
  }): Promise<Message>;
}
