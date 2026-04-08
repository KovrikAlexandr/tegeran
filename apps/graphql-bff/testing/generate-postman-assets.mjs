import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const collectionPath = join(__dirname, 'graphql-bff-flow.postman_collection.json');
const environmentPath = join(__dirname, 'graphql-bff-local.postman_environment.json');

mkdirSync(__dirname, { recursive: true });

const collection = {
  info: {
    _postman_id: randomUUID(),
    name: 'GraphQL-BFF Manual Flow',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'Automated GraphQL-BFF flow based on apps/graphql-bff/README.md. The run is sequential, stores identifiers and tokens, and verifies GraphQL responses.',
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

            pm.collectionVariables.set('userAName', 'Alice GraphQL');
            pm.collectionVariables.set('userBName', 'Bob GraphQL');
            pm.collectionVariables.set('userCName', 'Charlie GraphQL');
            pm.collectionVariables.set('userDName', 'Diana GraphQL');

            pm.collectionVariables.set('userAEmail', 'alice.graphql.' + runSuffix + '@example.com');
            pm.collectionVariables.set('userBEmail', 'bob.graphql.' + runSuffix + '@example.com');
            pm.collectionVariables.set('userCEmail', 'charlie.graphql.' + runSuffix + '@example.com');
            pm.collectionVariables.set('userDEmail', 'diana.graphql.' + runSuffix + '@example.com');

            pm.collectionVariables.set('groupChatName', 'Project Team ' + runSuffix);
            pm.collectionVariables.set('renamedGroupChatName', 'Renamed Project Team ' + runSuffix);
            pm.collectionVariables.set('directMessageText', 'Hello Bob from Postman ' + runSuffix);
            pm.collectionVariables.set('groupMessageTextA', 'Hello team from Postman ' + runSuffix);
            pm.collectionVariables.set('groupMessageTextB', 'Reply from Bob ' + runSuffix);
          }
        `),
      },
    },
  ],
  variable: [
    variable('baseUrl', 'http://localhost:3001'),
    variable('graphqlUrl', 'http://localhost:3001/graphql'),
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
    variable('userBAuthSubject', ''),
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
    variable('messagesNextCursor', ''),
    variable('groupChatName', ''),
    variable('renamedGroupChatName', ''),
    variable('directMessageText', ''),
    variable('groupMessageTextA', ''),
    variable('groupMessageTextB', ''),
  ],
  item: [
    graphqlItem({
      name: '01 Health',
      query: `
        query Health {
          health {
            status
          }
        }
      `,
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Health query has no GraphQL errors', function () {
          pm.expect(body.errors).to.be.undefined;
        });

        pm.test('Health status is ok', function () {
          pm.expect(body.data.health.status).to.eql('ok');
        });
      `,
    }),
    graphqlItem({
      name: '02 Register User A',
      query: `
        mutation RegisterA($input: RegisterInput!) {
          register(input: $input) {
            id
            authSubject
            name
            email
          }
        }
      `,
      variables: {
        input: {
          name: '{{userAName}}',
          email: '{{userAEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const user = body.data.register;
        pm.collectionVariables.set('userAId', user.id);
        pm.collectionVariables.set('userAAuthSubject', user.authSubject);

        pm.test('User A email matches generated value', function () {
          pm.expect(user.email).to.eql(pm.collectionVariables.get('userAEmail'));
        });
      `,
    }),
    graphqlItem({
      name: '03 Register User B',
      query: `
        mutation RegisterB($input: RegisterInput!) {
          register(input: $input) {
            id
            authSubject
            email
          }
        }
      `,
      variables: {
        input: {
          name: '{{userBName}}',
          email: '{{userBEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const user = body.data.register;
        pm.collectionVariables.set('userBId', user.id);
        pm.collectionVariables.set('userBAuthSubject', user.authSubject);

        pm.test('User B email matches generated value', function () {
          pm.expect(user.email).to.eql(pm.collectionVariables.get('userBEmail'));
        });
      `,
    }),
    graphqlItem({
      name: '04 Register User C',
      query: `
        mutation RegisterC($input: RegisterInput!) {
          register(input: $input) {
            id
            email
          }
        }
      `,
      variables: {
        input: {
          name: '{{userCName}}',
          email: '{{userCEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const user = body.data.register;
        pm.collectionVariables.set('userCId', user.id);

        pm.test('User C email matches generated value', function () {
          pm.expect(user.email).to.eql(pm.collectionVariables.get('userCEmail'));
        });
      `,
    }),
    graphqlItem({
      name: '05 Login User A',
      query: `
        mutation LoginA($input: LoginInput!) {
          login(input: $input) {
            accessToken
            tokenType
            expiresIn
          }
        }
      `,
      variables: {
        input: {
          email: '{{userAEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const login = body.data.login;
        pm.collectionVariables.set('accessTokenA', login.accessToken);

        pm.test('User A token is present', function () {
          pm.expect(login.accessToken).to.be.a('string').and.not.empty;
          pm.expect(login.tokenType).to.eql('Bearer');
        });
      `,
    }),
    graphqlItem({
      name: '06 Login User B',
      query: `
        mutation LoginB($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `,
      variables: {
        input: {
          email: '{{userBEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.collectionVariables.set('accessTokenB', body.data.login.accessToken);

        pm.test('User B token is present', function () {
          pm.expect(body.data.login.accessToken).to.be.a('string').and.not.empty;
        });
      `,
    }),
    graphqlItem({
      name: '07 Login User C',
      query: `
        mutation LoginC($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `,
      variables: {
        input: {
          email: '{{userCEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.collectionVariables.set('accessTokenC', body.data.login.accessToken);

        pm.test('User C token is present', function () {
          pm.expect(body.data.login.accessToken).to.be.a('string').and.not.empty;
        });
      `,
    }),
    graphqlItem({
      name: '08 Me for User A',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query Me {
          me {
            id
            authSubject
            name
            email
          }
        }
      `,
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const user = body.data.me;

        pm.test('Me returns user A', function () {
          pm.expect(user.email).to.eql(pm.collectionVariables.get('userAEmail'));
          pm.expect(user.id).to.eql(pm.collectionVariables.get('userAId'));
        });
      `,
    }),
    graphqlItem({
      name: '09 Initial Chats for User A',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query Chats {
          chats {
            id
            name
            type
            lastMessage {
              content
              createdAt
            }
          }
        }
      `,
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('Chats query returns an array', function () {
          pm.expect(body.data.chats).to.be.an('array');
        });
      `,
    }),
    graphqlItem({
      name: '10 Create or Get Direct Chat',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation DirectChat($input: GetOrCreateDirectChatInput!) {
          getOrCreateDirectChat(input: $input) {
            id
            type
            members {
              role
              user {
                email
              }
            }
          }
        }
      `,
      variables: {
        input: {
          email: '{{userBEmail}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const chat = body.data.getOrCreateDirectChat;
        pm.collectionVariables.set('directChatId', chat.id);

        pm.test('Direct chat is returned', function () {
          pm.expect(chat.type).to.eql('DIRECT');
          pm.expect(chat.members).to.have.length(2);
        });
      `,
    }),
    graphqlItem({
      name: '11 Repeat Direct Chat Without Duplicate',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation DirectChatAgain($input: GetOrCreateDirectChatInput!) {
          getOrCreateDirectChat(input: $input) {
            id
            type
          }
        }
      `,
      variables: {
        input: {
          email: '{{userBEmail}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('Repeated direct chat returns same id', function () {
          pm.expect(body.data.getOrCreateDirectChat.id).to.eql(pm.collectionVariables.get('directChatId'));
        });
      `,
    }),
    graphqlItem({
      name: '12 Create Group Chat',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation CreateGroup($input: CreateGroupChatInput!) {
          createGroupChat(input: $input) {
            id
            name
            type
            members {
              role
              user {
                email
              }
            }
          }
        }
      `,
      variables: {
        input: {
          name: '{{groupChatName}}',
          memberEmails: ['{{userBEmail}}', '{{userCEmail}}'],
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const chat = body.data.createGroupChat;
        pm.collectionVariables.set('groupChatId', chat.id);

        pm.test('Group chat is created', function () {
          pm.expect(chat.type).to.eql('GROUP');
          pm.expect(chat.name).to.eql(pm.collectionVariables.get('groupChatName'));
          pm.expect(chat.members).to.have.length(3);
        });
      `,
    }),
    graphqlItem({
      name: '13 Get Group Chat Members',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query ChatMembers($chatId: ID!) {
          chatMembers(chatId: $chatId) {
            role
            user {
              id
              email
              name
            }
          }
        }
      `,
      variables: {
        chatId: '{{groupChatId}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;
        const members = body.data.chatMembers;

        pm.test('Alice is owner and Bob/Charlie are members', function () {
          const roles = Object.fromEntries(members.map(function (member) {
            return [member.user.email, member.role];
          }));

          pm.expect(roles[pm.collectionVariables.get('userAEmail')]).to.eql('OWNER');
          pm.expect(roles[pm.collectionVariables.get('userBEmail')]).to.eql('MEMBER');
          pm.expect(roles[pm.collectionVariables.get('userCEmail')]).to.eql('MEMBER');
        });
      `,
    }),
    graphqlItem({
      name: '14 Register User D',
      query: `
        mutation RegisterD($input: RegisterInput!) {
          register(input: $input) {
            id
            email
          }
        }
      `,
      variables: {
        input: {
          name: '{{userDName}}',
          email: '{{userDEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;
        pm.expect(body.data.register.email).to.eql(pm.collectionVariables.get('userDEmail'));
      `,
    }),
    graphqlItem({
      name: '15 Login User D',
      query: `
        mutation LoginD($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `,
      variables: {
        input: {
          email: '{{userDEmail}}',
          password: '{{password}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;
        pm.collectionVariables.set('accessTokenD', body.data.login.accessToken);

        pm.test('User D token is present', function () {
          pm.expect(body.data.login.accessToken).to.be.a('string').and.not.empty;
        });
      `,
    }),
    graphqlItem({
      name: '16 Me for User D',
      authorizationTokenVariable: 'accessTokenD',
      query: `
        query MeD {
          me {
            id
            email
          }
        }
      `,
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.collectionVariables.set('userDId', body.data.me.id);

        pm.test('Me returns user D', function () {
          pm.expect(body.data.me.email).to.eql(pm.collectionVariables.get('userDEmail'));
        });
      `,
    }),
    graphqlItem({
      name: '17 Add Member D to Group Chat',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation AddMember($input: AddMemberToChatInput!) {
          addMemberToChat(input: $input) {
            chatId
            userId
            role
            user {
              email
            }
          }
        }
      `,
      variables: {
        input: {
          chatId: '{{groupChatId}}',
          userId: '{{userDId}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('D is added as member', function () {
          pm.expect(body.data.addMemberToChat.userId).to.eql(pm.collectionVariables.get('userDId'));
          pm.expect(body.data.addMemberToChat.role).to.eql('MEMBER');
          pm.expect(body.data.addMemberToChat.user.email).to.eql(pm.collectionVariables.get('userDEmail'));
        });
      `,
    }),
    graphqlItem({
      name: '18 Verify Members After Add',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query ChatMembersAfterAdd($chatId: ID!) {
          chatMembers(chatId: $chatId) {
            user {
              email
            }
          }
        }
      `,
      variables: {
        chatId: '{{groupChatId}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const emails = body.data.chatMembers.map(function (member) {
          return member.user.email;
        });

        pm.test('D is present in members list', function () {
          pm.expect(emails).to.include(pm.collectionVariables.get('userDEmail'));
          pm.expect(body.data.chatMembers).to.have.length(4);
        });
      `,
    }),
    graphqlItem({
      name: '19 Remove Member C by Email',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation RemoveMember($input: RemoveMemberFromChatInput!) {
          removeMemberFromChat(input: $input)
        }
      `,
      variables: {
        input: {
          chatId: '{{groupChatId}}',
          email: '{{userCEmail}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('Remove member mutation returns true', function () {
          pm.expect(body.data.removeMemberFromChat).to.eql(true);
        });
      `,
    }),
    graphqlItem({
      name: '20 Verify Members After Remove',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query ChatMembersAfterRemove($chatId: ID!) {
          chatMembers(chatId: $chatId) {
            user {
              email
            }
          }
        }
      `,
      variables: {
        chatId: '{{groupChatId}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const emails = body.data.chatMembers.map(function (member) {
          return member.user.email;
        });

        pm.test('C is absent and D remains in group', function () {
          pm.expect(emails).to.not.include(pm.collectionVariables.get('userCEmail'));
          pm.expect(emails).to.include(pm.collectionVariables.get('userDEmail'));
          pm.expect(body.data.chatMembers).to.have.length(3);
        });
      `,
    }),
    graphqlItem({
      name: '21 Send Direct Message',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation SendDirectMessage($input: SendMessageInput!) {
          sendMessage(input: $input) {
            id
            chatId
            senderId
            content
            createdAt
          }
        }
      `,
      variables: {
        input: {
          chatId: '{{directChatId}}',
          content: '{{directMessageText}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('Direct message content matches', function () {
          pm.expect(body.data.sendMessage.chatId).to.eql(pm.collectionVariables.get('directChatId'));
          pm.expect(body.data.sendMessage.content).to.eql(pm.collectionVariables.get('directMessageText'));
        });
      `,
    }),
    graphqlItem({
      name: '22 Send Group Message from A',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation SendGroupMessageA($input: SendMessageInput!) {
          sendMessage(input: $input) {
            id
            chatId
            content
            createdAt
          }
        }
      `,
      variables: {
        input: {
          chatId: '{{groupChatId}}',
          content: '{{groupMessageTextA}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('First group message matches', function () {
          pm.expect(body.data.sendMessage.content).to.eql(pm.collectionVariables.get('groupMessageTextA'));
        });
      `,
    }),
    graphqlItem({
      name: '23 Send Group Message from B',
      authorizationTokenVariable: 'accessTokenB',
      query: `
        mutation SendGroupMessageB($input: SendMessageInput!) {
          sendMessage(input: $input) {
            id
            chatId
            content
            createdAt
          }
        }
      `,
      variables: {
        input: {
          chatId: '{{groupChatId}}',
          content: '{{groupMessageTextB}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('Second group message matches', function () {
          pm.expect(body.data.sendMessage.content).to.eql(pm.collectionVariables.get('groupMessageTextB'));
        });
      `,
    }),
    graphqlItem({
      name: '24 Get Group Messages Page 1',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query MessagesPage1($chatId: ID!, $limit: Int, $cursor: String) {
          messages(chatId: $chatId, limit: $limit, cursor: $cursor) {
            items {
              id
              content
              createdAt
            }
            nextCursor
            hasMore
          }
        }
      `,
      variables: {
        chatId: '{{groupChatId}}',
        limit: 1,
        cursor: null,
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const connection = body.data.messages;
        pm.collectionVariables.set('messagesNextCursor', connection.nextCursor);

        pm.test('Page 1 returns first group message and cursor', function () {
          pm.expect(connection.items).to.have.length(1);
          pm.expect(connection.items[0].content).to.eql(pm.collectionVariables.get('groupMessageTextA'));
          pm.expect(connection.hasMore).to.eql(true);
          pm.expect(connection.nextCursor).to.be.a('string').and.not.empty;
        });
      `,
    }),
    graphqlItem({
      name: '25 Get Group Messages Page 2',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query MessagesPage2($chatId: ID!, $limit: Int, $cursor: String) {
          messages(chatId: $chatId, limit: $limit, cursor: $cursor) {
            items {
              id
              content
              createdAt
            }
            nextCursor
            hasMore
          }
        }
      `,
      variables: {
        chatId: '{{groupChatId}}',
        limit: 1,
        cursor: '{{messagesNextCursor}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const connection = body.data.messages;

        pm.test('Page 2 returns second group message', function () {
          pm.expect(connection.items).to.have.length(1);
          pm.expect(connection.items[0].content).to.eql(pm.collectionVariables.get('groupMessageTextB'));
          pm.expect(connection.hasMore).to.eql(false);
          pm.expect(connection.nextCursor).to.eql(null);
        });
      `,
    }),
    graphqlItem({
      name: '26 Rename Group Chat',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation RenameGroup($input: RenameGroupChatInput!) {
          renameGroupChat(input: $input) {
            id
            name
            type
          }
        }
      `,
      variables: {
        input: {
          chatId: '{{groupChatId}}',
          name: '{{renamedGroupChatName}}',
        },
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('Group chat is renamed', function () {
          pm.expect(body.data.renameGroupChat.name).to.eql(pm.collectionVariables.get('renamedGroupChatName'));
          pm.expect(body.data.renameGroupChat.type).to.eql('GROUP');
        });
      `,
    }),
    graphqlItem({
      name: '27 Delete Group Chat',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        mutation DeleteChat($chatId: ID!) {
          deleteChat(chatId: $chatId)
        }
      `,
      variables: {
        chatId: '{{groupChatId}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        pm.test('Delete chat mutation returns true', function () {
          pm.expect(body.data.deleteChat).to.eql(true);
        });
      `,
    }),
    graphqlItem({
      name: '28 Verify Deleted Chat Returns GraphQL Error',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query DeletedChat($id: ID!) {
          chat(id: $id) {
            id
            name
          }
        }
      `,
      variables: {
        id: '{{groupChatId}}',
      },
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();

        pm.test('Deleted chat query returns errors', function () {
          pm.expect(body.errors).to.be.an('array').and.not.empty;
          pm.expect(body.errors[0].message.toLowerCase()).to.include('not found');
        });
      `,
    }),
    graphqlItem({
      name: '29 Verify Chats After Delete',
      authorizationTokenVariable: 'accessTokenA',
      query: `
        query ChatsAfterDelete {
          chats {
            id
            type
          }
        }
      `,
      tests: `
        pm.test('HTTP status is 200', function () {
          pm.response.to.have.status(200);
        });

        const body = pm.response.json();
        pm.expect(body.errors).to.be.undefined;

        const chatIds = body.data.chats.map(function (chat) {
          return chat.id;
        });

        pm.test('Group chat is gone and direct chat remains', function () {
          pm.expect(chatIds).to.not.include(pm.collectionVariables.get('groupChatId'));
          pm.expect(chatIds).to.include(pm.collectionVariables.get('directChatId'));
        });
      `,
    }),
  ],
};

const environment = {
  id: randomUUID(),
  name: 'GraphQL-BFF Local',
  values: [
    environmentVariable('baseUrl', 'http://localhost:3001'),
    environmentVariable('graphqlUrl', '{{baseUrl}}/graphql'),
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

function graphqlItem({ name, query, variables, tests, authorizationTokenVariable }) {
  const headers = [
    {
      key: 'Content-Type',
      value: 'application/json',
      type: 'text',
    },
  ];

  if (authorizationTokenVariable) {
    headers.push({
      key: 'Authorization',
      value: `Bearer {{${authorizationTokenVariable}}}`,
      type: 'text',
    });
  }

  return {
    name,
    request: {
      method: 'POST',
      header: headers,
      body: {
        mode: 'raw',
        raw: JSON.stringify(
          {
            query: compact(query),
            ...(variables !== undefined ? { variables } : {}),
          },
          null,
          2,
        ),
        options: {
          raw: {
            language: 'json',
          },
        },
      },
      url: {
        raw: '{{graphqlUrl}}',
        host: ['{{graphqlUrl}}'],
      },
    },
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

function compact(value) {
  return value
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .join(' ');
}

function lines(value) {
  return value
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\s{10}/, ''))
    .filter(Boolean);
}
