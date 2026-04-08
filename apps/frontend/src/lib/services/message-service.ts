import { graphqlRequest } from '@/lib/graphql/client';
import { SEND_MESSAGE_MUTATION } from '@/lib/graphql/operations';
import { Message } from '@/lib/types';

interface SendMessageResponse {
  sendMessage: Message;
}

export async function sendMessage(token: string, chatId: string, content: string): Promise<Message> {
  const data = await graphqlRequest<SendMessageResponse, { input: { chatId: string; content: string } }>(
    SEND_MESSAGE_MUTATION,
    {
      input: {
        chatId,
        content,
      },
    },
    token,
  );

  return data.sendMessage;
}

export function subscribeToMessages(
  _chatId: string,
  _handler: () => void,
): () => void {
  // Placeholder for future realtime integration. For now the page reloads data on demand.
  return () => {};
}
