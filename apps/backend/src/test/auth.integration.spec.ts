import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../app.module';
import { configureHttpApp } from '../bootstrap';
import { CHATS_DAO, MESSAGES_DAO, USERS_DAO } from '../contracts/tokens';
import { PrismaService } from '../prisma/prisma.service';
import { createBackendTestContext } from './in-memory-daos';

const AUTH_TEST_BASE_URL = process.env.AUTH_TEST_BASE_URL ?? 'http://localhost:3000/api/v1';

describe('Auth integration with Keycloak', () => {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const registrationPayload = {
    name: 'Alice Keycloak',
    email: `alice.${uniqueSuffix}@example.com`,
    password: 'secret123',
  };

  let accessToken = '';
  let registeredUser: { authSubject: string; name: string; email: string } | undefined;

  beforeAll(async () => {
    await waitForHealthcheck();
  }, 120000);

  it('registers a new user through backend and Keycloak', async () => {
    const response = await fetchJson('/auth/register', {
      method: 'POST',
      body: registrationPayload,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: registrationPayload.name,
      email: registrationPayload.email,
    });
    expect(typeof response.body.authSubject).toBe('string');
    expect(response.body.authSubject).not.toHaveLength(0);

    registeredUser = response.body as { authSubject: string; name: string; email: string };
  });

  it('rejects duplicate registration with the same email', async () => {
    const response = await fetchJson('/auth/register', {
      method: 'POST',
      body: registrationPayload,
    });

    expect(response.status).toBe(409);
  });

  it('logs in and returns access token', async () => {
    const response = await fetchJson('/auth/login', {
      method: 'POST',
      body: {
        email: registrationPayload.email,
        password: registrationPayload.password,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tokenType: 'Bearer',
    });
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.accessToken.length).toBeGreaterThan(20);
    expect(typeof response.body.expiresIn).toBe('number');

    accessToken = response.body.accessToken;
  });

  it('rejects login with invalid credentials', async () => {
    const response = await fetchJson('/auth/login', {
      method: 'POST',
      body: {
        email: registrationPayload.email,
        password: 'wrong-password',
      },
    });

    expect(response.status).toBe(401);
  });

  it('rejects protected endpoint without token when AUTH_ENABLED=true', async () => {
    const response = await fetch(`${AUTH_TEST_BASE_URL}/me`);

    expect(response.status).toBe(401);
  });

  it('rejects protected endpoint with invalid token', async () => {
    const response = await fetch(`${AUTH_TEST_BASE_URL}/me`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(401);
  });

  it('returns current local user for a valid Keycloak token', async () => {
    const response = await fetch(`${AUTH_TEST_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as { authSubject: string; name: string; email: string };
    expect(body).toMatchObject({
      authSubject: registeredUser?.authSubject,
      name: registrationPayload.name,
      email: registrationPayload.email,
    });
  });
});

describe('Feature flag compatibility without real auth', () => {
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

  it('still works in mock mode when AUTH_ENABLED=false', async () => {
    process.env.AUTH_ENABLED = 'false';
    process.env.MOCK_AUTH_SUBJECT = 'mock-user';
    process.env.MOCK_USER_NAME = 'Mock User';
    process.env.MOCK_USER_EMAIL = 'mock-user@local.test';

    const context = createBackendTestContext();
    app = await createLocalHttpApp(context);

    const response = await request(app.getHttpServer()).get('/api/v1/me').expect(200);

    expect(response.body).toMatchObject({
      authSubject: 'mock-user',
      name: 'Mock User',
      email: 'mock-user@local.test',
    });
  });
});

async function fetchJson(
  path: string,
  options: { method: string; body?: Record<string, unknown> },
): Promise<{ status: number; body: Record<string, any> }> {
  const response = await fetch(`${AUTH_TEST_BASE_URL}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = (await response.json()) as Record<string, any>;

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

async function createLocalHttpApp(context: ReturnType<typeof createBackendTestContext>): Promise<INestApplication> {
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
