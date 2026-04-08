import { graphqlRequest } from '@/lib/graphql/client';
import {
  CHAT_PAGE_QUERY,
  CHATS_PAGE_QUERY,
  CREATE_GROUP_CHAT_MUTATION,
  GET_OR_CREATE_DIRECT_CHAT_MUTATION,
} from '@/lib/graphql/operations';
import { Chat, ChatPageData, ChatsPageData } from '@/lib/types';

interface ChatsPageResponse extends ChatsPageData {}
interface ChatPageResponse extends ChatPageData {}
interface ChatMutationResponse {
  createGroupChat?: Chat;
  getOrCreateDirectChat?: Chat;
}

export async function loadChatsPageData(token: string): Promise<ChatsPageData> {
  return graphqlRequest<ChatsPageResponse>(CHATS_PAGE_QUERY, undefined, token);
}

export async function loadChatPageData(token: string, chatId: string): Promise<ChatPageData> {
  return graphqlRequest<ChatPageResponse, { chatId: string; limit: number }>(
    CHAT_PAGE_QUERY,
    {
      chatId,
      limit: 100,
    },
    token,
  );
}

export async function getOrCreateDirectChat(token: string, email: string): Promise<Chat> {
  const data = await graphqlRequest<ChatMutationResponse, { input: { email: string } }>(
    GET_OR_CREATE_DIRECT_CHAT_MUTATION,
    {
      input: {
        email,
      },
    },
    token,
  );

  if (!data.getOrCreateDirectChat) {
    throw new Error('Direct chat was not returned');
  }

  return data.getOrCreateDirectChat;
}

export async function createGroupChat(
  token: string,
  input: { name: string; memberEmails: string[] },
): Promise<Chat> {
  const data = await graphqlRequest<ChatMutationResponse, { input: typeof input }>(
    CREATE_GROUP_CHAT_MUTATION,
    {
      input,
    },
    token,
  );

  if (!data.createGroupChat) {
    throw new Error('Group chat was not returned');
  }

  return data.createGroupChat;
}
