import { ChatMemberRole, ChatType } from '../domain/enums';
import { AccessDeniedError, BusinessRuleError, ConflictError, NotFoundError } from '../domain/errors';
import { asCurrentUser, createBackendTestContext } from './in-memory-daos';

describe('ChatsService', () => {
  it('creates a direct chat between two users', async () => {
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
      peerUserId: bob.id,
    });

    expect(chat.type).toBe(ChatType.DIRECT);
    expect(chat.name).toBeNull();
    expect(chat.members).toHaveLength(2);
    expect(chat.members.map((member) => member.userId)).toEqual([alice.id, bob.id]);
  });

  it('forbids creating a second direct chat for the same pair', async () => {
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

    await context.chatsService.createDirectChat(asCurrentUser(alice), {
      peerUserId: bob.id,
    });

    await expect(
      context.chatsService.createDirectChat(asCurrentUser(alice), {
        peerUserId: bob.id,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('creates a group chat with one owner and members', async () => {
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
      memberUserIds: [bob.id, charlie.id, bob.id],
    });

    expect(chat.type).toBe(ChatType.GROUP);
    expect(chat.name).toBe('Team chat');
    expect(chat.members).toHaveLength(3);
    expect(chat.members.find((member) => member.userId === alice.id)?.role).toBe(ChatMemberRole.OWNER);
    expect(chat.members.filter((member) => member.role === ChatMemberRole.MEMBER)).toHaveLength(2);
  });

  it('returns only chats where the current user is a participant', async () => {
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

    const visibleChat = await context.seedChat({
      name: 'Visible',
      type: ChatType.GROUP,
      members: [
        { userId: alice.id, role: ChatMemberRole.OWNER },
        { userId: bob.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await context.seedChat({
      name: 'Hidden',
      type: ChatType.GROUP,
      members: [
        { userId: bob.id, role: ChatMemberRole.OWNER },
        { userId: charlie.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await expect(context.chatsService.getUserChats(asCurrentUser(alice))).resolves.toEqual([visibleChat]);
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
