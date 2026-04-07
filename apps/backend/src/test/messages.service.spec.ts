import { ChatMemberRole, ChatType } from '../domain/enums';
import { NotFoundError } from '../domain/errors';
import { asCurrentUser, createBackendTestContext } from './in-memory-daos';

describe('MessagesService', () => {
  it('sends a message for a chat participant', async () => {
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'kc-alice',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const bob = await context.seedUser({
      authSubject: 'kc-bob',
      name: 'Bob',
      email: 'bob@example.com',
    });
    const chat = await context.seedChat({
      name: null,
      type: ChatType.DIRECT,
      members: [
        { userId: alice.id, role: ChatMemberRole.MEMBER },
        { userId: bob.id, role: ChatMemberRole.MEMBER },
      ],
    });

    const message = await context.messagesService.sendMessage(asCurrentUser(alice), {
      chatId: chat.id,
      content: 'hello',
    });

    expect(message.senderId).toBe(alice.id);
    expect(message.chatId).toBe(chat.id);
    expect(message.content).toBe('hello');
  });

  it('forbids sending a message to a chat for a non-participant', async () => {
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'kc-alice',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const bob = await context.seedUser({
      authSubject: 'kc-bob',
      name: 'Bob',
      email: 'bob@example.com',
    });
    const outsider = await context.seedUser({
      authSubject: 'kc-outsider',
      name: 'Outsider',
      email: 'outsider@example.com',
    });
    const chat = await context.seedChat({
      name: null,
      type: ChatType.DIRECT,
      members: [
        { userId: alice.id, role: ChatMemberRole.MEMBER },
        { userId: bob.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(
      context.messagesService.sendMessage(asCurrentUser(outsider), {
        chatId: chat.id,
        content: 'not allowed',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns sorted chat history to participants only', async () => {
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'kc-alice',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const bob = await context.seedUser({
      authSubject: 'kc-bob',
      name: 'Bob',
      email: 'bob@example.com',
    });
    const outsider = await context.seedUser({
      authSubject: 'kc-outsider',
      name: 'Outsider',
      email: 'outsider@example.com',
    });
    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [
        { userId: alice.id, role: ChatMemberRole.OWNER },
        { userId: bob.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await context.seedMessage({
      chatId: chat.id,
      senderId: bob.id,
      content: 'second',
    });
    await context.seedMessage({
      chatId: chat.id,
      senderId: alice.id,
      content: 'third',
    });
    await context.seedMessage({
      chatId: chat.id,
      senderId: alice.id,
      content: 'ignored promise still awaited by history order',
    });

    const history = await context.messagesService.getChatHistory(asCurrentUser(alice), chat.id);

    expect(history.map((message) => message.content)).toEqual([
      'second',
      'third',
      'ignored promise still awaited by history order',
    ]);

    await expect(context.messagesService.getChatHistory(asCurrentUser(outsider), chat.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
