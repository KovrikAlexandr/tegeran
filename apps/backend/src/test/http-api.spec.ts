import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import request from 'supertest';

import { AppModule } from '../app.module';
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
    });
  });

  it('validates request DTOs and returns 400', async () => {
    process.env.AUTH_ENABLED = 'false';
    const context = createBackendTestContext();
    app = await createHttpApp(context);

    await request(app.getHttpServer())
      .post('/api/v1/chats/group')
      .send({ name: '', memberUserIds: [] })
      .expect(400);
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
});

async function createHttpApp(context: ReturnType<typeof createBackendTestContext>): Promise<INestApplication> {
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
    .compile();

  const app = testingModule.createNestApplication();
  configureHttpApp(app);
  await app.init();
  return app;
}
