export interface HealthResponse {
  status: string;
}

export interface User {
  id: number;
  authSubject: string;
  name: string;
  email: string;
}

export interface ChatLastMessage {
  content: string;
  createdAt: string;
}

export interface ChatMember {
  id: number;
  chatId: number;
  userId: number;
  role: 'OWNER' | 'MEMBER';
  user: User;
}

export interface Chat {
  id: number;
  name: string | null;
  type: 'DIRECT' | 'GROUP';
  members: ChatMember[];
  lastMessage: ChatLastMessage | null;
}

export interface Message {
  id: number;
  content: string;
  senderId: number;
  chatId: number;
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
