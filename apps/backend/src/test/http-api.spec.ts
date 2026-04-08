import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import request from 'supertest';

import { AppModule } from '../app.module';
import { KeycloakAuthService } from '../auth/keycloak/keycloak-auth.service';
import { configureHttpApp } from '../bootstrap';
import { CHATS_DAO, MESSAGES_DAO, USERS_DAO } from '../contracts/tokens';
import { ChatMemberRole, ChatType } from '../domain/enums';
import { createBackendTestContext } from './in-memory-daos';

describe('HTTP API', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.AUTH_ENABLED;
    delete process.env.MOCK_AUTH_SUBJECT;
    delete process.env.MOCK_USER_NAME;
    delete process.env.MOCK_USER_EMAIL;
  });

  it('serves health endpoint publicly when auth is enabled', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    app = await createHttpApp(context);

    await request(app.getHttpServer()).get('/api/v1/health').expect(200, {
      status: 'ok',
    });
  });

  it('auto-provisions and returns mock current user when AUTH_ENABLED=false', async () => {
    process.env.AUTH_ENABLED = 'false';
    process.env.MOCK_AUTH_SUBJECT = 'mock-user';
    process.env.MOCK_USER_NAME = 'Mock User';
    process.env.MOCK_USER_EMAIL = 'mock-user@local.test';

    const context = createBackendTestContext();
    app = await createHttpApp(context);

    const response = await request(app.getHttpServer()).get('/api/v1/me').expect(200);

    expect(response.body).toMatchObject({
      authSubject: 'mock-user',
      name: 'Mock User',
      email: 'mock-user@local.test',
    });
  });

  it('requires bearer auth for protected endpoints when AUTH_ENABLED=true', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    app = await createHttpApp(context);

    await request(app.getHttpServer()).get('/api/v1/chats').expect(401);
  });

  it('returns chats for authenticated user when AUTH_ENABLED=true', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'alice-subject',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const bob = await context.seedUser({
      authSubject: 'bob-subject',
      name: 'Bob',
      email: 'bob@example.com',
    });

    await context.seedChat({
      name: 'General',
      type: ChatType.GROUP,
      members: [
        { userId: alice.id, role: ChatMemberRole.OWNER },
        { userId: bob.id, role: ChatMemberRole.MEMBER },
      ],
    });

    app = await createHttpApp(context);

    const response = await request(app.getHttpServer())
      .get('/api/v1/chats')
      .set('Authorization', 'Bearer alice-subject')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      name: 'General',
      type: 'GROUP',
      lastMessage: null,
    });
  });

  it('validates request DTOs and returns 400', async () => {
    process.env.AUTH_ENABLED = 'false';
    const context = createBackendTestContext();
    app = await createHttpApp(context);

    await request(app.getHttpServer())
      .post('/api/v1/chats/group')
      .send({ name: '', memberEmails: ['not-an-email'] })
      .expect(400);
  });

  it('creates or returns a direct chat by email over HTTP', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'alice-subject',
      name: 'Alice',
      email: 'alice@example.com',
    });
    await context.seedUser({
      authSubject: 'bob-subject',
      name: 'Bob',
      email: 'bob@example.com',
    });

    app = await createHttpApp(context);

    const firstResponse = await request(app.getHttpServer())
      .post('/api/v1/chats/direct')
      .set('Authorization', `Bearer ${alice.authSubject}`)
      .send({ email: 'bob@example.com' })
      .expect(200);

    const secondResponse = await request(app.getHttpServer())
      .post('/api/v1/chats/direct')
      .set('Authorization', `Bearer ${alice.authSubject}`)
      .send({ email: 'bob@example.com' })
      .expect(200);

    expect(firstResponse.body.id).toBe(secondResponse.body.id);
  });

  it('creates a group chat by member emails over HTTP', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'alice-subject',
      name: 'Alice',
      email: 'alice@example.com',
    });
    await context.seedUser({
      authSubject: 'bob-subject',
      name: 'Bob',
      email: 'bob@example.com',
    });
    await context.seedUser({
      authSubject: 'charlie-subject',
      name: 'Charlie',
      email: 'charlie@example.com',
    });

    app = await createHttpApp(context);

    const response = await request(app.getHttpServer())
      .post('/api/v1/chats/group')
      .set('Authorization', `Bearer ${alice.authSubject}`)
      .send({
        name: 'Project team',
        memberEmails: ['bob@example.com', 'charlie@example.com', 'bob@example.com', 'alice@example.com'],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Project team',
      type: 'GROUP',
    });
    expect(response.body.members).toHaveLength(3);
    expect(response.body.members.find((member: { user: { email: string }; role: string }) => member.user.email === 'alice@example.com')?.role).toBe('OWNER');
  });

  it('adds a group member via HTTP endpoint', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'owner-subject',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'member-subject',
      name: 'Member',
      email: 'member@example.com',
    });

    const chat = await context.seedChat({
      name: 'Group',
      type: ChatType.GROUP,
      members: [{ userId: owner.id, role: ChatMemberRole.OWNER }],
    });

    app = await createHttpApp(context);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/chats/${chat.id}/members`)
      .set('Authorization', 'Bearer owner-subject')
      .send({ userId: member.id })
      .expect(201);

    expect(response.body).toMatchObject({
      chatId: chat.id,
      userId: member.id,
      role: 'MEMBER',
    });
  });

  it('removes a group member by email via HTTP endpoint', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'owner-subject',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'member-subject',
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

    app = await createHttpApp(context);

    await request(app.getHttpServer())
      .delete(`/api/v1/chats/${chat.id}/members/by-email`)
      .set('Authorization', 'Bearer owner-subject')
      .send({ email: 'member@example.com' })
      .expect(204);

    const membersResponse = await request(app.getHttpServer())
      .get(`/api/v1/chats/${chat.id}/members`)
      .set('Authorization', 'Bearer owner-subject')
      .expect(200);

    expect(membersResponse.body).toHaveLength(1);
    expect(membersResponse.body[0].user.email).toBe('owner@example.com');
  });

  it('renames a group chat over HTTP and forbids renaming direct chats', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const owner = await context.seedUser({
      authSubject: 'owner-subject',
      name: 'Owner',
      email: 'owner@example.com',
    });
    const member = await context.seedUser({
      authSubject: 'member-subject',
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

    app = await createHttpApp(context);

    await request(app.getHttpServer())
      .patch(`/api/v1/chats/${groupChat.id}`)
      .set('Authorization', 'Bearer member-subject')
      .send({ name: 'After' })
      .expect(403);

    const renamedResponse = await request(app.getHttpServer())
      .patch(`/api/v1/chats/${groupChat.id}`)
      .set('Authorization', 'Bearer owner-subject')
      .send({ name: 'After' })
      .expect(200);

    expect(renamedResponse.body.name).toBe('After');

    await request(app.getHttpServer())
      .patch(`/api/v1/chats/${directChat.id}`)
      .set('Authorization', 'Bearer owner-subject')
      .send({ name: 'Nope' })
      .expect(400);
  });

  it('sends and lists messages over HTTP', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'alice-subject',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const bob = await context.seedUser({
      authSubject: 'bob-subject',
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

    app = await createHttpApp(context);

    await request(app.getHttpServer())
      .post(`/api/v1/chats/${chat.id}/messages`)
      .set('Authorization', 'Bearer alice-subject')
      .send({ content: 'Hello API' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/chats/${chat.id}/messages`)
      .set('Authorization', 'Bearer alice-subject')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      chatId: chat.id,
      senderId: alice.id,
      content: 'Hello API',
    });
  });

  it('returns chats sorted by last message and includes preview over HTTP', async () => {
    process.env.AUTH_ENABLED = 'true';
    const context = createBackendTestContext();
    const alice = await context.seedUser({
      authSubject: 'alice-subject',
      name: 'Alice',
      email: 'alice@example.com',
    });
    const bob = await context.seedUser({
      authSubject: 'bob-subject',
      name: 'Bob',
      email: 'bob@example.com',
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
      type: ChatType.DIRECT,
      members: [
        { userId: alice.id, role: ChatMemberRole.MEMBER },
        { userId: bob.id, role: ChatMemberRole.MEMBER },
      ],
    });

    await context.seedMessage({
      chatId: olderChat.id,
      senderId: bob.id,
      content: 'older',
    });
    await context.seedMessage({
      chatId: newerChat.id,
      senderId: alice.id,
      content: 'newer',
    });

    app = await createHttpApp(context);

    const response = await request(app.getHttpServer())
      .get('/api/v1/chats')
      .set('Authorization', 'Bearer alice-subject')
      .expect(200);

    expect(response.body.map((chat: { id: number }) => chat.id)).toEqual([newerChat.id, olderChat.id]);
    expect(response.body[0].lastMessage).toMatchObject({ content: 'newer' });
    expect(response.body[1].lastMessage).toMatchObject({ content: 'older' });
  });
});

async function createHttpApp(context: ReturnType<typeof createBackendTestContext>): Promise<INestApplication> {
  const keycloakAuthServiceStub = {
    register: jest.fn(),
    login: jest.fn(),
    verifyAccessToken: async (token: string) => ({
      authSubject: token,
      issuer: 'http://test-issuer',
      email: `${token}@example.com`,
      name: token,
    }),
  };

  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(USERS_DAO)
    .useValue(context.usersDao)
    .overrideProvider(CHATS_DAO)
    .useValue(context.chatsDao)
    .overrideProvider(MESSAGES_DAO)
    .useValue(context.messagesDao)
    .overrideProvider(PrismaService)
    .useValue({
      $connect: async () => undefined,
      $disconnect: async () => undefined,
    })
    .overrideProvider(KeycloakAuthService)
    .useValue(keycloakAuthServiceStub)
    .compile();

  const app = testingModule.createNestApplication();
  configureHttpApp(app);
  await app.init();
  return app;
}
