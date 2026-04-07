import { CreateChatDaoInput, ChatsDao, MessagesDao, UsersDao } from '../contracts/dao';
import { CurrentUser } from '../domain/current-user';
import { ConflictError } from '../domain/errors';
import { ChatType } from '../domain/enums';
import { Chat, ChatMember, Message, User } from '../domain/models';
import { ChatsService } from '../services/chats.service';
import { MessagesService } from '../services/messages.service';
import { UsersService } from '../services/users.service';

interface StoredChat {
  id: number;
  name: string | null;
  type: ChatType;
}

interface StoredChatMember {
  id: number;
  chatId: number;
  userId: number;
  role: ChatMember['role'];
}

interface InMemoryStore {
  users: User[];
  chats: StoredChat[];
  members: StoredChatMember[];
  messages: Message[];
  nextUserId: number;
  nextChatId: number;
  nextMemberId: number;
  nextMessageId: number;
}

class InMemoryUsersDao implements UsersDao {
  constructor(private readonly store: InMemoryStore) {}

  async findByAuthSubject(authSubject: string): Promise<User | null> {
    return this.cloneUser(this.store.users.find((user) => user.authSubject === authSubject) ?? null);
  }

  async findById(id: number): Promise<User | null> {
    return this.cloneUser(this.store.users.find((user) => user.id === id) ?? null);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.cloneUser(this.store.users.find((user) => user.email === email) ?? null);
  }

  async create(input: { authSubject: string; name: string; email: string }): Promise<User> {
    if (this.store.users.some((user) => user.authSubject === input.authSubject)) {
      throw new ConflictError(`User with authSubject "${input.authSubject}" already exists`);
    }

    if (this.store.users.some((user) => user.email === input.email)) {
      throw new ConflictError(`User with email "${input.email}" already exists`);
    }

    const user: User = {
      id: this.store.nextUserId++,
      authSubject: input.authSubject,
      name: input.name,
      email: input.email,
    };

    this.store.users.push(user);

    return this.cloneUser(user)!;
  }

  private cloneUser(user: User | null): User | null {
    return user ? { ...user } : null;
  }
}

class InMemoryChatsDao implements ChatsDao {
  constructor(private readonly store: InMemoryStore) {}

  async listByUserId(userId: number): Promise<Chat[]> {
    return this.store.chats
      .filter((chat) => this.store.members.some((member) => member.chatId === chat.id && member.userId === userId))
      .map((chat) => this.buildChat(chat.id))
      .filter((chat): chat is Chat => chat !== null);
  }

  async findById(chatId: number): Promise<Chat | null> {
    return this.buildChat(chatId);
  }

  async findAccessibleById(chatId: number, userId: number): Promise<Chat | null> {
    const chat = await this.findById(chatId);

    if (!chat) {
      return null;
    }

    return chat.members.some((member) => member.userId === userId) ? chat : null;
  }

  async findDirectChatBetweenUsers(firstUserId: number, secondUserId: number): Promise<Chat | null> {
    const expectedPair = [firstUserId, secondUserId].sort((left, right) => left - right).join(':');

    for (const chat of this.store.chats) {
      if (chat.type !== ChatType.DIRECT) {
        continue;
      }

      const members = this.store.members
        .filter((member) => member.chatId === chat.id)
        .map((member) => member.userId)
        .sort((left, right) => left - right);

      if (members.join(':') === expectedPair) {
        return this.buildChat(chat.id);
      }
    }

    return null;
  }

  async create(input: CreateChatDaoInput): Promise<Chat> {
    const chat: StoredChat = {
      id: this.store.nextChatId++,
      name: input.name,
      type: input.type,
    };

    this.store.chats.push(chat);

    for (const memberInput of input.members) {
      this.store.members.push({
        id: this.store.nextMemberId++,
        chatId: chat.id,
        userId: memberInput.userId,
        role: memberInput.role,
      });
    }

    return this.buildChat(chat.id)!;
  }

  async delete(chatId: number): Promise<void> {
    this.store.chats = this.store.chats.filter((chat) => chat.id !== chatId);
    this.store.members = this.store.members.filter((member) => member.chatId !== chatId);
    this.store.messages = this.store.messages.filter((message) => message.chatId !== chatId);
  }

  async removeMember(chatId: number, userId: number): Promise<void> {
    this.store.members = this.store.members.filter(
      (member) => !(member.chatId === chatId && member.userId === userId),
    );
  }

  private buildChat(chatId: number): Chat | null {
    const chat = this.store.chats.find((item) => item.id === chatId);

    if (!chat) {
      return null;
    }

    const members: ChatMember[] = this.store.members
      .filter((member) => member.chatId === chat.id)
      .sort((left, right) => left.id - right.id)
      .map((member) => {
        const user = this.store.users.find((candidate) => candidate.id === member.userId);

        if (!user) {
          throw new Error(`Missing seeded user with id "${member.userId}"`);
        }

        return {
          id: member.id,
          chatId: member.chatId,
          userId: member.userId,
          role: member.role,
          user: { ...user },
        };
      });

    return {
      id: chat.id,
      name: chat.name,
      type: chat.type,
      members,
    };
  }
}

class InMemoryMessagesDao implements MessagesDao {
  constructor(private readonly store: InMemoryStore) {}

  async listByChatId(chatId: number): Promise<Message[]> {
    return this.store.messages
      .filter((message) => message.chatId === chatId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id - right.id)
      .map((message) => ({
        ...message,
        createdAt: new Date(message.createdAt),
      }));
  }

  async create(input: { chatId: number; senderId: number; content: string }): Promise<Message> {
    const message: Message = {
      id: this.store.nextMessageId++,
      chatId: input.chatId,
      senderId: input.senderId,
      content: input.content,
      createdAt: new Date(Date.UTC(2024, 0, 1, 0, 0, this.store.nextMessageId)),
    };

    this.store.messages.push(message);

    return {
      ...message,
      createdAt: new Date(message.createdAt),
    };
  }
}

export function createBackendTestContext() {
  const store: InMemoryStore = {
    users: [],
    chats: [],
    members: [],
    messages: [],
    nextUserId: 1,
    nextChatId: 1,
    nextMemberId: 1,
    nextMessageId: 1,
  };

  const usersDao = new InMemoryUsersDao(store);
  const chatsDao = new InMemoryChatsDao(store);
  const messagesDao = new InMemoryMessagesDao(store);

  const usersService = new UsersService(usersDao);
  const chatsService = new ChatsService(usersDao, chatsDao);
  const messagesService = new MessagesService(usersDao, chatsDao, messagesDao);

  return {
    usersDao,
    chatsDao,
    messagesDao,
    usersService,
    chatsService,
    messagesService,
    async seedUser(input: { authSubject: string; name: string; email: string }) {
      return usersDao.create(input);
    },
    async seedChat(input: CreateChatDaoInput) {
      return chatsDao.create(input);
    },
    async seedMessage(input: { chatId: number; senderId: number; content: string }) {
      return messagesDao.create(input);
    },
  };
}

export function asCurrentUser(user: User): CurrentUser {
  return { authSubject: user.authSubject };
}
