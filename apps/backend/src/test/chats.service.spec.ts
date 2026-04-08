import { ChatMemberRole, ChatType } from '../domain/enums';
import { AccessDeniedError, BusinessRuleError, NotFoundError } from '../domain/errors';
import { asCurrentUser, createBackendTestContext } from './in-memory-daos';

describe('ChatsService', () => {
  it('creates a direct chat between two users by email', async () => {
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

    const chat = await context.chatsService.createDirectChat(asCurrentUser(alice), {
      email: bob.email,
    });

    expect(chat.type).toBe(ChatType.DIRECT);
    expect(chat.name).toBeNull();
    expect(chat.members).toHaveLength(2);
    expect(chat.members.map((member) => member.userId)).toEqual([alice.id, bob.id]);
    expect(chat.lastMessage).toBeNull();
  });

  it('returns an existing direct chat for the same pair instead of creating a duplicate', async () => {
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

    const firstChat = await context.chatsService.createDirectChat(asCurrentUser(alice), {
      email: bob.email,
    });

    const secondChat = await context.chatsService.createDirectChat(asCurrentUser(alice), {
      email: bob.email,
    });

    expect(secondChat.id).toBe(firstChat.id);
  });

  it('forbids creating a direct chat with self by email', async () => {
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'kc-alice',
      name: 'Alice',
      email: 'alice@example.com',
    });

    await expect(
      context.chatsService.createDirectChat(asCurrentUser(alice), {
        email: alice.email,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('creates a group chat with one owner and members by email', async () => {
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
    const charlie = await context.seedUser({
      authSubject: 'kc-charlie',
      name: 'Charlie',
      email: 'charlie@example.com',
    });

    const chat = await context.chatsService.createGroupChat(asCurrentUser(alice), {
      name: ' Team chat ',
      memberEmails: [bob.email, charlie.email, bob.email, alice.email],
    });

    expect(chat.type).toBe(ChatType.GROUP);
    expect(chat.name).toBe('Team chat');
    expect(chat.members).toHaveLength(3);
    expect(chat.members.find((member) => member.userId === alice.id)?.role).toBe(ChatMemberRole.OWNER);
    expect(chat.members.filter((member) => member.role === ChatMemberRole.MEMBER)).toHaveLength(2);
  });

  it('fails to create a group chat when one of member emails is missing', async () => {
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'kc-alice',
      name: 'Alice',
      email: 'alice@example.com',
    });

    await expect(
      context.chatsService.createGroupChat(asCurrentUser(alice), {
        name: 'Team chat',
        memberEmails: ['missing@example.com'],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns chats sorted by last message timestamp with previews', async () => {
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
    const charlie = await context.seedUser({
      authSubject: 'kc-charlie',
      name: 'Charlie',
      email: 'charlie@example.com',
    });

    const olderChat = await context.seedChat({
      name: 'Older',
      type: ChatType.GROUP,
      members: [
        { userId: alice.id, role: ChatMemberRole.OWNER },
        { userId: bob.id, role: ChatMemberRole.MEMBER },
      ],
    });

    const newerChat = await context.seedChat({
      name: 'Newer',
      type: ChatType.GROUP,
      members: [
        { userId: alice.id, role: ChatMemberRole.OWNER },
        { userId: charlie.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await context.seedMessage({
      chatId: olderChat.id,
      senderId: bob.id,
      content: 'older',
    });
    await context.seedMessage({
      chatId: newerChat.id,
      senderId: charlie.id,
      content: 'newer',
    });

    const chats = await context.chatsService.getUserChats(asCurrentUser(alice));

    expect(chats.map((chat) => chat.id)).toEqual([newerChat.id, olderChat.id]);
    expect(chats[0].lastMessage?.content).toBe('newer');
    expect(chats[1].lastMessage?.content).toBe('older');
  });

  it('deletes a group chat only for the owner', async () => {
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'kc-owner',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'kc-member',
      name: 'Member',
      email: 'member@example.com',
    });

    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [
        { userId: owner.id, role: ChatMemberRole.OWNER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(
      context.chatsService.deleteGroupChat(asCurrentUser(member), {
        chatId: chat.id,
      }),
    ).rejects.toBeInstanceOf(AccessDeniedError);

    await expect(
      context.chatsService.deleteGroupChat(asCurrentUser(owner), {
        chatId: chat.id,
      }),
    ).resolves.toBeUndefined();

    await expect(context.chatsDao.findById(chat.id)).resolves.toBeNull();
  });

  it('removes related members and messages when deleting a group chat', async () => {
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'kc-owner',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'kc-member',
      name: 'Member',
      email: 'member@example.com',
    });

    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [
        { userId: owner.id, role: ChatMemberRole.OWNER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await context.seedMessage({
      chatId: chat.id,
      senderId: owner.id,
      content: 'hello',
    });
    await context.seedMessage({
      chatId: chat.id,
      senderId: member.id,
      content: 'world',
    });

    await context.chatsService.deleteGroupChat(asCurrentUser(owner), {
      chatId: chat.id,
    });

    expect(await context.chatsDao.findById(chat.id)).toBeNull();
    expect(await context.messagesDao.listByChatId(chat.id)).toEqual([]);
  });

  it('forbids deleting a direct chat', async () => {
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

    await expect(
      context.chatsService.deleteGroupChat(asCurrentUser(alice), {
        chatId: chat.id,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('allows a member to leave a group chat but forbids the owner', async () => {
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'kc-owner',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'kc-member',
      name: 'Member',
      email: 'member@example.com',
    });

    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [
        { userId: owner.id, role: ChatMemberRole.OWNER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(
      context.chatsService.leaveGroupChat(asCurrentUser(owner), {
        chatId: chat.id,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    await expect(
      context.chatsService.leaveGroupChat(asCurrentUser(member), {
        chatId: chat.id,
      }),
    ).resolves.toBeUndefined();

    const updatedChat = await context.chatsDao.findById(chat.id);
    expect(updatedChat?.members.map((chatMember) => chatMember.userId)).toEqual([owner.id]);
  });

  it('forbids leaving a direct chat', async () => {
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

    await expect(
      context.chatsService.leaveGroupChat(asCurrentUser(alice), {
        chatId: chat.id,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('allows only the owner to remove a member from a group chat', async () => {
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'kc-owner',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'kc-member',
      name: 'Member',
      email: 'member@example.com',
    });

    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [
        { userId: owner.id, role: ChatMemberRole.OWNER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(
      context.chatsService.removeGroupMember(asCurrentUser(member), {
        chatId: chat.id,
        memberUserId: owner.id,
      }),
    ).rejects.toBeInstanceOf(AccessDeniedError);

    await expect(
      context.chatsService.removeGroupMember(asCurrentUser(owner), {
        chatId: chat.id,
        memberUserId: member.id,
      }),
    ).resolves.toBeUndefined();
  });

  it('allows the owner to remove a member from a group chat by email', async () => {
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'kc-owner',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'kc-member',
      name: 'Member',
      email: 'member@example.com',
    });

    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [
        { userId: owner.id, role: ChatMemberRole.OWNER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(
      context.chatsService.removeGroupMemberByEmail(asCurrentUser(owner), {
        chatId: chat.id,
        email: member.email,
      }),
    ).resolves.toBeUndefined();

    expect((await context.chatsDao.findById(chat.id))?.members).toHaveLength(1);
  });

  it('forbids removing owner from a group chat by email', async () => {
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'kc-owner',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'kc-member',
      name: 'Member',
      email: 'member@example.com',
    });

    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [
        { userId: owner.id, role: ChatMemberRole.OWNER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(
      context.chatsService.removeGroupMemberByEmail(asCurrentUser(owner), {
        chatId: chat.id,
        email: owner.email,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('renames a group chat only for the owner', async () => {
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'kc-owner',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'kc-member',
      name: 'Member',
      email: 'member@example.com',
    });

    const groupChat = await context.seedChat({
      name: 'Before',
      type: ChatType.GROUP,
      members: [
        { userId: owner.id, role: ChatMemberRole.OWNER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    const directChat = await context.seedChat({
      name: null,
      type: ChatType.DIRECT,
      members: [
        { userId: owner.id, role: ChatMemberRole.MEMBER },
        { userId: member.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(
      context.chatsService.renameGroupChat(asCurrentUser(member), {
        chatId: groupChat.id,
        name: 'After',
      }),
    ).rejects.toBeInstanceOf(AccessDeniedError);

    await expect(
      context.chatsService.renameGroupChat(asCurrentUser(owner), {
        chatId: directChat.id,
        name: 'After',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);

    const renamedChat = await context.chatsService.renameGroupChat(asCurrentUser(owner), {
      chatId: groupChat.id,
      name: '  After  ',
    });

    expect(renamedChat.name).toBe('After');
  });

  it('returns chat members only to participants', async () => {
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

    await expect(context.chatsService.getChatMembers(asCurrentUser(alice), chat.id)).resolves.toHaveLength(2);
    await expect(context.chatsService.getChatMembers(asCurrentUser(outsider), chat.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('uses authSubject to resolve the current local user', async () => {
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'kc-alice',
      name: 'Alice',
      email: 'alice@example.com',
    });

    await context.seedChat({
      name: 'Personal group',
      type: ChatType.GROUP,
      members: [{ userId: alice.id, role: ChatMemberRole.OWNER }],
    });

    await expect(
      context.chatsService.getUserChats({
        authSubject: 'kc-alice',
      }),
    ).resolves.toHaveLength(1);

    await expect(
      context.chatsService.getUserChats({
        authSubject: 'unknown-auth-subject',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
