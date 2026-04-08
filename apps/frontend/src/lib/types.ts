export type ChatType = 'DIRECT' | 'GROUP';
export type ChatMemberRole = 'OWNER' | 'MEMBER';

export interface User {
  id: string;
  authSubject: string;
  name: string;
  email: string;
}

export interface ChatLastMessage {
  content: string;
  createdAt: string;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: ChatMemberRole;
  user: User;
}

export interface Chat {
  id: string;
  name: string | null;
  type: ChatType;
  members: ChatMember[];
  lastMessage: ChatLastMessage | null;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  createdAt: string;
}

export interface MessageConnection {
  items: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ChatsPageData {
  me: User;
  chats: Chat[];
}

export interface ChatPageData {
  me: User;
  chat: Chat;
  messages: MessageConnection;
}
