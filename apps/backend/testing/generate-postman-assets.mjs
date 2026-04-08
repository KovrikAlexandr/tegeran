import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const collectionPath = join(__dirname, 'backend-rest-flow.postman_collection.json');
const environmentPath = join(__dirname, 'backend-local.postman_environment.json');

mkdirSync(__dirname, { recursive: true });

const collection = {
  info: {
    _postman_id: randomUUID(),
    name: 'Backend REST API Flow',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'Automated backend REST flow based on the existing GraphQL-BFF manual scenario, adapted to actual backend REST contracts.',
  },
  event: [
    {
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: lines(`
          if (!pm.collectionVariables.get('runSuffix')) {
            const runSuffix = Date.now() + '-' + Math.floor(Math.random() * 100000);

            pm.collectionVariables.set('runSuffix', runSuffix);
            pm.collectionVariables.set('password', 'secret123');

            pm.collectionVariables.set('userAName', 'Alice REST');
            pm.collectionVariables.set('userBName', 'Bob REST');
            pm.collectionVariables.set('userCName', 'Charlie REST');
            pm.collectionVariables.set('userDName', 'Diana REST');

            pm.collectionVariables.set('userAEmail', 'alice.rest.' + runSuffix + '@example.com');
            pm.collectionVariables.set('userBEmail', 'bob.rest.' + runSuffix + '@example.com');
            pm.collectionVariables.set('userCEmail', 'charlie.rest.' + runSuffix + '@example.com');
            pm.collectionVariables.set('userDEmail', 'diana.rest.' + runSuffix + '@example.com');

            pm.collectionVariables.set('groupChatName', 'Project Team ' + runSuffix);
            pm.collectionVariables.set('renamedGroupChatName', 'Renamed Project Team ' + runSuffix);
            pm.collectionVariables.set('directMessageText', 'Hello Bob from backend Postman ' + runSuffix);
            pm.collectionVariables.set('groupMessageTextA', 'Hello team from backend Postman ' + runSuffix);
            pm.collectionVariables.set('groupMessageTextB', 'Reply from Bob backend ' + runSuffix);
          }
        `),
      },
    },
  ],
  variable: [
    variable('baseUrl', 'http://localhost:3000'),
    variable('apiBaseUrl', 'http://localhost:3000/api/v1'),
    variable('runSuffix', ''),
    variable('password', ''),
    variable('userAName', ''),
    variable('userAEmail', ''),
    variable('userAId', ''),
    variable('userAAuthSubject', ''),
    variable('accessTokenA', ''),
    variable('userBName', ''),
    variable('userBEmail', ''),
    variable('userBId', ''),
    variable('accessTokenB', ''),
    variable('userCName', ''),
    variable('userCEmail', ''),
    variable('userCId', ''),
    variable('accessTokenC', ''),
    variable('userDName', ''),
    variable('userDEmail', ''),
    variable('userDId', ''),
    variable('accessTokenD', ''),
    variable('directChatId', ''),
    variable('groupChatId', ''),
    variable('groupChatName', ''),
    variable('renamedGroupChatName', ''),
    variable('directMessageText', ''),
    variable('groupMessageTextA', ''),
    variable('groupMessageTextB', ''),
  ],
  item: [
    restItem({
      name: '01 Health',
      method: 'GET',
      path: '/health',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Health status is ok', function () {
          pm.expect(body.status).to.eql('ok');
        });
      `,
    }),
    restItem({
      name: '02 Register User A',
      method: 'POST',
      path: '/auth/register',
      body: {
        name: '{{userAName}}',
        email: '{{userAEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('userAId', body.id);
        pm.collectionVariables.set('userAAuthSubject', body.authSubject);

        pm.test('User A registration payload is returned', function () {
          pm.expect(body.email).to.eql(pm.collectionVariables.get('userAEmail'));
          pm.expect(body.authSubject).to.be.a('string').and.not.empty;
        });
      `,
    }),
    restItem({
      name: '03 Register User B',
      method: 'POST',
      path: '/auth/register',
      body: {
        name: '{{userBName}}',
        email: '{{userBEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('userBId', body.id);

        pm.test('User B registration payload is returned', function () {
          pm.expect(body.email).to.eql(pm.collectionVariables.get('userBEmail'));
        });
      `,
    }),
    restItem({
      name: '04 Register User C',
      method: 'POST',
      path: '/auth/register',
      body: {
        name: '{{userCName}}',
        email: '{{userCEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('userCId', body.id);

        pm.test('User C registration payload is returned', function () {
          pm.expect(body.email).to.eql(pm.collectionVariables.get('userCEmail'));
        });
      `,
    }),
    restItem({
      name: '05 Login User A',
      method: 'POST',
      path: '/auth/login',
      body: {
        email: '{{userAEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('accessTokenA', body.accessToken);

        pm.test('User A token is present', function () {
          pm.expect(body.accessToken).to.be.a('string').and.not.empty;
          pm.expect(body.tokenType).to.eql('Bearer');
        });
      `,
    }),
    restItem({
      name: '06 Login User B',
      method: 'POST',
      path: '/auth/login',
      body: {
        email: '{{userBEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('accessTokenB', body.accessToken);

        pm.test('User B token is present', function () {
          pm.expect(body.accessToken).to.be.a('string').and.not.empty;
        });
      `,
    }),
    restItem({
      name: '07 Login User C',
      method: 'POST',
      path: '/auth/login',
      body: {
        email: '{{userCEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('accessTokenC', body.accessToken);

        pm.test('User C token is present', function () {
          pm.expect(body.accessToken).to.be.a('string').and.not.empty;
        });
      `,
    }),
    restItem({
      name: '08 Me for User A',
      method: 'GET',
      path: '/me',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Me returns user A', function () {
          pm.expect(body.email).to.eql(pm.collectionVariables.get('userAEmail'));
          pm.expect(body.id).to.eql(Number(pm.collectionVariables.get('userAId')));
        });
      `,
    }),
    restItem({
      name: '09 Initial Chats for User A',
      method: 'GET',
      path: '/chats',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Chats endpoint returns an array', function () {
          pm.expect(body).to.be.an('array');
        });
      `,
    }),
    restItem({
      name: '10 Create or Get Direct Chat',
      method: 'POST',
      path: '/chats/direct',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        email: '{{userBEmail}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('directChatId', body.id);

        pm.test('Direct chat is returned', function () {
          pm.expect(body.type).to.eql('DIRECT');
          pm.expect(body.members).to.have.length(2);
        });
      `,
    }),
    restItem({
      name: '11 Repeat Direct Chat Without Duplicate',
      method: 'POST',
      path: '/chats/direct',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        email: '{{userBEmail}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Repeated direct chat returns same id', function () {
          pm.expect(String(body.id)).to.eql(pm.collectionVariables.get('directChatId'));
        });
      `,
    }),
    restItem({
      name: '12 Create Group Chat',
      method: 'POST',
      path: '/chats/group',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        name: '{{groupChatName}}',
        memberEmails: ['{{userBEmail}}', '{{userCEmail}}'],
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('groupChatId', body.id);

        pm.test('Group chat is created', function () {
          pm.expect(body.type).to.eql('GROUP');
          pm.expect(body.name).to.eql(pm.collectionVariables.get('groupChatName'));
          pm.expect(body.members).to.have.length(3);
        });
      `,
    }),
    restItem({
      name: '13 Get Group Chat Members',
      method: 'GET',
      path: '/chats/{{groupChatId}}/members',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Alice is owner and Bob/Charlie are members', function () {
          const roles = Object.fromEntries(body.map(function (member) {
            return [member.user.email, member.role];
          }));

          pm.expect(roles[pm.collectionVariables.get('userAEmail')]).to.eql('OWNER');
          pm.expect(roles[pm.collectionVariables.get('userBEmail')]).to.eql('MEMBER');
          pm.expect(roles[pm.collectionVariables.get('userCEmail')]).to.eql('MEMBER');
        });
      `,
    }),
    restItem({
      name: '14 Register User D',
      method: 'POST',
      path: '/auth/register',
      body: {
        name: '{{userDName}}',
        email: '{{userDEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();

        pm.test('User D registration payload is returned', function () {
          pm.expect(body.email).to.eql(pm.collectionVariables.get('userDEmail'));
        });
      `,
    }),
    restItem({
      name: '15 Login User D',
      method: 'POST',
      path: '/auth/login',
      body: {
        email: '{{userDEmail}}',
        password: '{{password}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('accessTokenD', body.accessToken);

        pm.test('User D token is present', function () {
          pm.expect(body.accessToken).to.be.a('string').and.not.empty;
        });
      `,
    }),
    restItem({
      name: '16 Me for User D',
      method: 'GET',
      path: '/me',
      authorizationTokenVariable: 'accessTokenD',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.collectionVariables.set('userDId', body.id);

        pm.test('Me returns user D', function () {
          pm.expect(body.email).to.eql(pm.collectionVariables.get('userDEmail'));
        });
      `,
    }),
    restItem({
      name: '17 Add Member D to Group Chat',
      method: 'POST',
      path: '/chats/{{groupChatId}}/members',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        userId: '{{userDId}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();

        pm.test('D is added as member', function () {
          pm.expect(String(body.userId)).to.eql(pm.collectionVariables.get('userDId'));
          pm.expect(body.role).to.eql('MEMBER');
          pm.expect(body.user.email).to.eql(pm.collectionVariables.get('userDEmail'));
        });
      `,
    }),
    restItem({
      name: '18 Verify Members After Add',
      method: 'GET',
      path: '/chats/{{groupChatId}}/members',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        const emails = body.map(function (member) {
          return member.user.email;
        });

        pm.test('D is present in members list', function () {
          pm.expect(emails).to.include(pm.collectionVariables.get('userDEmail'));
          pm.expect(body).to.have.length(4);
        });
      `,
    }),
    restItem({
      name: '19 Remove Member C by Email',
      method: 'DELETE',
      path: '/chats/{{groupChatId}}/members/by-email',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        email: '{{userCEmail}}',
      },
      tests: `
        pm.test('HTTP status is 204', function () {
          pm.response.to.have.status(204);
        });
      `,
    }),
    restItem({
      name: '20 Verify Members After Remove',
      method: 'GET',
      path: '/chats/{{groupChatId}}/members',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        const emails = body.map(function (member) {
          return member.user.email;
        });

        pm.test('C is absent and D remains in group', function () {
          pm.expect(emails).to.not.include(pm.collectionVariables.get('userCEmail'));
          pm.expect(emails).to.include(pm.collectionVariables.get('userDEmail'));
          pm.expect(body).to.have.length(3);
        });
      `,
    }),
    restItem({
      name: '21 Send Direct Message',
      method: 'POST',
      path: '/chats/{{directChatId}}/messages',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        content: '{{directMessageText}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();

        pm.test('Direct message content matches', function () {
          pm.expect(String(body.chatId)).to.eql(pm.collectionVariables.get('directChatId'));
          pm.expect(body.content).to.eql(pm.collectionVariables.get('directMessageText'));
        });
      `,
    }),
    restItem({
      name: '22 Send Group Message from A',
      method: 'POST',
      path: '/chats/{{groupChatId}}/messages',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        content: '{{groupMessageTextA}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();

        pm.test('First group message matches', function () {
          pm.expect(body.content).to.eql(pm.collectionVariables.get('groupMessageTextA'));
        });
      `,
    }),
    restItem({
      name: '23 Send Group Message from B',
      method: 'POST',
      path: '/chats/{{groupChatId}}/messages',
      authorizationTokenVariable: 'accessTokenB',
      body: {
        content: '{{groupMessageTextB}}',
      },
      tests: `
        pm.test('HTTP status is 201', function () {
          pm.response.to.have.status(201);
        });

        const body = pm.response.json();

        pm.test('Second group message matches', function () {
          pm.expect(body.content).to.eql(pm.collectionVariables.get('groupMessageTextB'));
        });
      `,
    }),
    restItem({
      name: '24 Get Group Messages',
      method: 'GET',
      path: '/chats/{{groupChatId}}/messages',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Backend returns ordered message history', function () {
          pm.expect(body).to.be.an('array');
          pm.expect(body).to.have.length(2);
          pm.expect(body[0].content).to.eql(pm.collectionVariables.get('groupMessageTextA'));
          pm.expect(body[1].content).to.eql(pm.collectionVariables.get('groupMessageTextB'));
        });
      `,
    }),
    restItem({
      name: '25 Rename Group Chat',
      method: 'PATCH',
      path: '/chats/{{groupChatId}}',
      authorizationTokenVariable: 'accessTokenA',
      body: {
        name: '{{renamedGroupChatName}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Group chat is renamed', function () {
          pm.expect(body.name).to.eql(pm.collectionVariables.get('renamedGroupChatName'));
          pm.expect(body.type).to.eql('GROUP');
        });
      `,
    }),
    restItem({
      name: '26 Delete Group Chat',
      method: 'DELETE',
      path: '/chats/{{groupChatId}}',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 204', function () {
          pm.response.to.have.status(204);
        });
      `,
    }),
    restItem({
      name: '27 Verify Deleted Chat Returns 404',
      method: 'GET',
      path: '/chats/{{groupChatId}}',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 404', function () {
          pm.response.to.have.status(404);
        });

        const body = pm.response.json();

        pm.test('Deleted chat message mentions not found', function () {
          pm.expect(String(body.message).toLowerCase()).to.include('not found');
        });
      `,
    }),
    restItem({
      name: '28 Verify Chats After Delete',
      method: 'GET',
      path: '/chats',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        const chatIds = body.map(function (chat) {
          return String(chat.id);
        });

        pm.test('Group chat is gone and direct chat remains', function () {
          pm.expect(chatIds).to.not.include(pm.collectionVariables.get('groupChatId'));
          pm.expect(chatIds).to.include(pm.collectionVariables.get('directChatId'));
        });
      `,
    }),
    restItem({
      name: '29 Verify Delete Did Not Break Related Entities API',
      method: 'GET',
      path: '/chats/{{directChatId}}/messages',
      authorizationTokenVariable: 'accessTokenA',
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Direct chat API still works after group deletion', function () {
          pm.expect(body).to.be.an('array');
          pm.expect(body[0].content).to.eql(pm.collectionVariables.get('directMessageText'));
        });
      `,
    }),
  ],
};

const environment = {
  id: randomUUID(),
  name: 'Backend Local',
  values: [
    environmentVariable('baseUrl', 'http://localhost:3000'),
    environmentVariable('apiBaseUrl', '{{baseUrl}}/api/v1'),
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: 'OpenAI Codex',
};

writeFileSync(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
writeFileSync(environmentPath, `${JSON.stringify(environment, null, 2)}\n`);

console.log(`Generated ${collectionPath}`);
console.log(`Generated ${environmentPath}`);

function variable(key, value) {
  return {
    key,
    value,
    type: 'string',
  };
}

function environmentVariable(key, value) {
  return {
    key,
    value,
    type: 'default',
    enabled: true,
  };
}

function restItem({ name, method, path, body, tests, authorizationTokenVariable }) {
  const headers = [];

  if (body !== undefined) {
    headers.push({
      key: 'Content-Type',
      value: 'application/json',
      type: 'text',
    });
  }

  if (authorizationTokenVariable) {
    headers.push({
      key: 'Authorization',
      value: `Bearer {{${authorizationTokenVariable}}}`,
      type: 'text',
    });
  }

  const request = {
    method,
    header: headers,
    url: {
      raw: `{{apiBaseUrl}}${path}`,
      host: ['{{apiBaseUrl}}'],
      path: path.replace(/^\//, '').split('/'),
    },
  };

  if (body !== undefined) {
    request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  return {
    name,
    request,
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: lines(tests),
        },
      },
    ],
  };
}

function lines(value) {
  return value
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\s{10}/, ''))
    .filter(Boolean);
}
