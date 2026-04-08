import { PrismaClient } from '../../generated/client';
import { loadEnvironment } from '../config/load-environment';

loadEnvironment();

const AUTH_TEST_BASE_URL = process.env.AUTH_TEST_BASE_URL ?? 'http://localhost:3000/api/v1';

describe('Frontend-oriented backend scenarios', () => {
  const prisma = new PrismaClient();
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const alice = {
    name: 'Alice Frontend',
    email: `alice.${uniqueSuffix}@example.com`,
    password: 'secret123',
  };
  const bob = {
    name: 'Bob Frontend',
    email: `bob.${uniqueSuffix}@example.com`,
    password: 'secret123',
  };
  const charlie = {
    name: 'Charlie Frontend',
    email: `charlie.${uniqueSuffix}@example.com`,
    password: 'secret123',
  };
  const dave = {
    name: 'Dave Frontend',
    email: `dave.${uniqueSuffix}@example.com`,
    password: 'secret123',
  };

  let aliceToken = '';
  let bobToken = '';
  let charlieToken = '';
  let directChatId = 0;
  let groupChatId = 0;
  let deletableGroupChatId = 0;
  let bobUserId = 0;
  let charlieUserId = 0;

  beforeAll(async () => {
    await waitForHealthcheck();
    await prisma.$connect();

    await registerUser(alice);
    const bobUser = await registerUser(bob);
    const charlieUser = await registerUser(charlie);
    await registerUser(dave);

    bobUserId = bobUser.id;
    charlieUserId = charlieUser.id;

    aliceToken = await login(alice.email, alice.password);
    bobToken = await login(bob.email, bob.password);
    charlieToken = await login(charlie.email, charlie.password);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates or returns a direct chat by email without duplicates', async () => {
    const firstResponse = await fetchJson('/chats/direct', {
      method: 'POST',
      token: aliceToken,
      body: { email: bob.email },
    });

    expect(firstResponse.status).toBe(200);
    const firstBody = expectBody(firstResponse);

    expect(firstBody).toMatchObject({
      type: 'DIRECT',
      name: null,
    });

    directChatId = firstBody.id as number;

    const secondResponse = await fetchJson('/chats/direct', {
      method: 'POST',
      token: aliceToken,
      body: { email: bob.email },
    });

    expect(secondResponse.status).toBe(200);
    expect(expectBody(secondResponse).id).toBe(directChatId);

    const selfChatResponse = await fetchJson('/chats/direct', {
      method: 'POST',
      token: aliceToken,
      body: { email: alice.email },
    });

    expect(selfChatResponse.status).toBe(400);

    const missingUserResponse = await fetchJson('/chats/direct', {
      method: 'POST',
      token: aliceToken,
      body: { email: `missing.${uniqueSuffix}@example.com` },
    });

    expect(missingUserResponse.status).toBe(404);
  });

  it('creates a group chat by member emails and keeps correct roles', async () => {
    const response = await fetchJson('/chats/group', {
      method: 'POST',
      token: aliceToken,
      body: {
        name: 'Project Team',
        memberEmails: [bob.email, charlie.email, bob.email, alice.email],
      },
    });

    expect(response.status).toBe(201);
    const groupBody = expectBody(response);

    expect(groupBody).toMatchObject({
      name: 'Project Team',
      type: 'GROUP',
    });

    groupChatId = groupBody.id as number;

    const membersByEmail = new Map(
      (groupBody.members as Array<{ role: string; user: { email: string } }>).map((member) => [
        member.user.email,
        member.role,
      ]),
    );

    expect(membersByEmail.size).toBe(3);
    expect(membersByEmail.get(alice.email)).toBe('OWNER');
    expect(membersByEmail.get(bob.email)).toBe('MEMBER');
    expect(membersByEmail.get(charlie.email)).toBe('MEMBER');

    const missingMemberResponse = await fetchJson('/chats/group', {
      method: 'POST',
      token: aliceToken,
      body: {
        name: 'Broken Group',
        memberEmails: [bob.email, `nobody.${uniqueSuffix}@example.com`],
      },
    });

    expect(missingMemberResponse.status).toBe(404);
  });

  it('removes a group member by email for owner only', async () => {
    const forbiddenResponse = await fetchJson(`/chats/${groupChatId}/members/by-email`, {
      method: 'DELETE',
      token: bobToken,
      body: { email: charlie.email },
    });

    expect(forbiddenResponse.status).toBe(403);

    const response = await fetchJson(`/chats/${groupChatId}/members/by-email`, {
      method: 'DELETE',
      token: aliceToken,
      body: { email: charlie.email },
    });

    expect(response.status).toBe(204);

    const membersResponse = await fetchJson(`/chats/${groupChatId}/members`, {
      method: 'GET',
      token: aliceToken,
    });

    expect(membersResponse.status).toBe(200);
    expect((membersResponse.body as Array<{ user: { email: string } }>).map((member) => member.user.email)).toEqual(
      expect.arrayContaining([alice.email, bob.email]),
    );
    expect((membersResponse.body as Array<{ user: { email: string } }>).some((member) => member.user.email === charlie.email)).toBe(false);

    const ownerRemovalResponse = await fetchJson(`/chats/${groupChatId}/members/by-email`, {
      method: 'DELETE',
      token: aliceToken,
      body: { email: alice.email },
    });

    expect(ownerRemovalResponse.status).toBe(400);
  });

  it('renames a group chat and rejects invalid rename scenarios', async () => {
    const forbiddenResponse = await fetchJson(`/chats/${groupChatId}`, {
      method: 'PATCH',
      token: bobToken,
      body: { name: 'Bob Rename Attempt' },
    });

    expect(forbiddenResponse.status).toBe(403);

    const successResponse = await fetchJson(`/chats/${groupChatId}`, {
      method: 'PATCH',
      token: aliceToken,
      body: { name: 'Renamed Project Team' },
    });

    expect(successResponse.status).toBe(200);
    expect(expectBody(successResponse).name).toBe('Renamed Project Team');

    const directRenameResponse = await fetchJson(`/chats/${directChatId}`, {
      method: 'PATCH',
      token: aliceToken,
      body: { name: 'Direct Rename Attempt' },
    });

    expect(directRenameResponse.status).toBe(400);
  });

  it('returns chats sorted by last message time with preview data', async () => {
    await fetchJson(`/chats/${directChatId}/messages`, {
      method: 'POST',
      token: bobToken,
      body: { content: 'Older direct message' },
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });

    await fetchJson(`/chats/${groupChatId}/messages`, {
      method: 'POST',
      token: aliceToken,
      body: { content: 'Newest group message' },
    });

    const response = await fetchJson('/chats', {
      method: 'GET',
      token: aliceToken,
    });

    expect(response.status).toBe(200);

    const chats = response.body as Array<{
      id: number;
      lastMessage: { content: string; createdAt: string } | null;
    }>;

    const directChat = chats.find((chat) => chat.id === directChatId);
    const groupChat = chats.find((chat) => chat.id === groupChatId);

    expect(chats[0].id).toBe(groupChatId);
    expect(groupChat?.lastMessage).toMatchObject({ content: 'Newest group message' });
    expect(typeof groupChat?.lastMessage?.createdAt).toBe('string');
    expect(directChat?.lastMessage).toMatchObject({ content: 'Older direct message' });
  });

  it('deletes a group chat with cascading members and messages removal', async () => {
    const createResponse = await fetchJson('/chats/group', {
      method: 'POST',
      token: aliceToken,
      body: {
        name: 'Cascade Check',
        memberEmails: [bob.email, charlie.email, dave.email],
      },
    });

    expect(createResponse.status).toBe(201);
    const createBody = expectBody(createResponse);

    deletableGroupChatId = createBody.id as number;

    await fetchJson(`/chats/${deletableGroupChatId}/messages`, {
      method: 'POST',
      token: aliceToken,
      body: { content: 'First message' },
    });
    await fetchJson(`/chats/${deletableGroupChatId}/messages`, {
      method: 'POST',
      token: bobToken,
      body: { content: 'Second message' },
    });

    const beforeDelete = await prisma.chat.findUnique({
      where: { id: deletableGroupChatId },
      include: {
        members: true,
        messages: true,
      },
    });

    expect(beforeDelete).not.toBeNull();
    expect(beforeDelete?.members).toHaveLength(4);
    expect(beforeDelete?.messages).toHaveLength(2);

    const deleteResponse = await fetchJson(`/chats/${deletableGroupChatId}`, {
      method: 'DELETE',
      token: aliceToken,
    });

    expect(deleteResponse.status).toBe(204);

    const deletedChat = await prisma.chat.findUnique({
      where: { id: deletableGroupChatId },
    });
    const remainingMembers = await prisma.chatMember.count({
      where: { chatId: deletableGroupChatId },
    });
    const remainingMessages = await prisma.message.count({
      where: { chatId: deletableGroupChatId },
    });

    expect(deletedChat).toBeNull();
    expect(remainingMembers).toBe(0);
    expect(remainingMessages).toBe(0);

    const getDeletedChatResponse = await fetchJson(`/chats/${deletableGroupChatId}`, {
      method: 'GET',
      token: aliceToken,
    });

    expect(getDeletedChatResponse.status).toBe(404);
  });

  it('rejects forbidden delete scenarios', async () => {
    const directDeleteResponse = await fetchJson(`/chats/${directChatId}`, {
      method: 'DELETE',
      token: aliceToken,
    });

    expect(directDeleteResponse.status).toBe(400);

    const nonOwnerDeleteResponse = await fetchJson(`/chats/${groupChatId}`, {
      method: 'DELETE',
      token: bobToken,
    });

    expect(nonOwnerDeleteResponse.status).toBe(403);
  });
});

type RegisteredUser = {
  id: number;
  authSubject: string;
  name: string;
  email: string;
};

type RequestOptions = {
  method: string;
  token?: string;
  body?: Record<string, unknown>;
};

async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisteredUser> {
  const response = await fetchJson('/auth/register', {
    method: 'POST',
    body: payload,
  });

  expect(response.status).toBe(201);
  return expectBody(response) as RegisteredUser;
}

async function login(email: string, password: string): Promise<string> {
  const response = await fetchJson('/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });

  expect(response.status).toBe(200);
  const body = expectBody(response);
  expect(typeof body.accessToken).toBe('string');
  return body.accessToken as string;
}

async function fetchJson(path: string, options: RequestOptions): Promise<{ status: number; body: Record<string, any> | null }> {
  const response = await fetch(`${AUTH_TEST_BASE_URL}${path}`, {
    method: options.method,
    headers: {
      ...(options.token
        ? {
            Authorization: `Bearer ${options.token}`,
          }
        : {}),
      ...(options.body
        ? {
            'Content-Type': 'application/json',
          }
        : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawBody = await response.text();
  const body = rawBody ? (JSON.parse(rawBody) as Record<string, any>) : null;

  return {
    status: response.status,
    body,
  };
}

async function waitForHealthcheck(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${AUTH_TEST_BASE_URL}/health`);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }

  throw new Error(`Backend did not become ready at ${AUTH_TEST_BASE_URL}/health`);
}

function expectBody(response: { body: Record<string, any> | null }): Record<string, any> {
  expect(response.body).not.toBeNull();
  return response.body as Record<string, any>;
}
