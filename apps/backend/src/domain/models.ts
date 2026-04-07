import { ChatMemberRole, ChatType } from './enums';

export interface User {
  id: number;
  authSubject: string;
  name: string;
  email: string;
}

export interface ChatMember {
  id: number;
  chatId: number;
  userId: number;
  role: ChatMemberRole;
  user: User;
}

export interface Chat {
  id: number;
  name: string | null;
  type: ChatType;
  members: ChatMember[];
}

export interface Message {
  id: number;
  content: string;
  senderId: number;
  chatId: number;
  createdAt: Date;
}
