import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { getBackendApiUrl } from '../config/runtime-config';
import { JsonLogger } from '../logging/json-logger.service';

import {
  Chat,
  ChatMember,
  HealthResponse,
  LoginResult,
  Message,
  MessageConnection,
  User,
} from './backend-api.types';

type RequestOptions = {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  authorization?: string;
};

@Injectable()
export class BackendApiClient {
  constructor(private readonly logger: JsonLogger) {}

  health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', {
      method: 'GET',
    });
  }

  getMe(authorization?: string): Promise<User> {
    return this.request<User>('/me', {
      method: 'GET',
      authorization,
    });
  }

  getChats(authorization?: string): Promise<Chat[]> {
    return this.request<Chat[]>('/chats', {
      method: 'GET',
      authorization,
    });
  }

  getChat(chatId: number, authorization?: string): Promise<Chat> {
    return this.request<Chat>(`/chats/${chatId}`, {
      method: 'GET',
      authorization,
    });
  }

  getChatMembers(chatId: number, authorization?: string): Promise<ChatMember[]> {
    return this.request<ChatMember[]>(`/chats/${chatId}/members`, {
      method: 'GET',
      authorization,
    });
  }

  async getMessages(
    chatId: number,
    limit: number | undefined,
    cursor: string | undefined,
    authorization?: string,
  ): Promise<MessageConnection> {
    const normalizedLimit = this.normalizeLimit(limit);
    const messages = await this.request<Message[]>(`/chats/${chatId}/messages`, {
      method: 'GET',
      authorization,
    });
    const startIndex = this.resolveCursorStartIndex(messages, cursor);
    const items = messages.slice(startIndex, startIndex + normalizedLimit);
    const hasMore = startIndex + normalizedLimit < messages.length;
    const nextCursor = hasMore && items.length > 0 ? String(items[items.length - 1].id) : null;

    this.logger.debug('Adapted backend messages response to GraphQL connection', 'BackendApiClient', {
      chatId,
      requestedLimit: limit,
      normalizedLimit,
      cursor,
      startIndex,
      returnedItems: items.length,
      hasMore,
      nextCursor,
    });

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  register(input: { name: string; email: string; password: string }): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: input,
    });
  }

  login(input: { email: string; password: string }): Promise<LoginResult> {
    return this.request<LoginResult>('/auth/login', {
      method: 'POST',
      body: input,
    });
  }

  getOrCreateDirectChatByEmail(input: { email: string }, authorization?: string): Promise<Chat> {
    return this.request<Chat>('/chats/direct', {
      method: 'POST',
      body: input,
      authorization,
    });
  }

  createGroupChat(input: { name: string; memberEmails: string[] }, authorization?: string): Promise<Chat> {
    return this.request<Chat>('/chats/group', {
      method: 'POST',
      body: input,
      authorization,
    });
  }

  renameGroupChat(chatId: number, input: { name: string }, authorization?: string): Promise<Chat> {
    return this.request<Chat>(`/chats/${chatId}`, {
      method: 'PATCH',
      body: input,
      authorization,
    });
  }

  sendMessage(chatId: number, input: { content: string }, authorization?: string): Promise<Message> {
    return this.request<Message>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: input,
      authorization,
    });
  }

  addMemberToChat(chatId: number, input: { userId: number }, authorization?: string): Promise<ChatMember> {
    return this.request<ChatMember>(`/chats/${chatId}/members`, {
      method: 'POST',
      body: input,
      authorization,
    });
  }

  async removeMemberFromChatByEmail(
    chatId: number,
    input: { email: string },
    authorization?: string,
  ): Promise<boolean> {
    await this.request<void>(`/chats/${chatId}/members/by-email`, {
      method: 'DELETE',
      body: input,
      authorization,
    });

    return true;
  }

  async leaveChat(chatId: number, authorization?: string): Promise<boolean> {
    await this.request<void>(`/chats/${chatId}/leave`, {
      method: 'POST',
      authorization,
    });

    return true;
  }

  async deleteChat(chatId: number, authorization?: string): Promise<boolean> {
    await this.request<void>(`/chats/${chatId}`, {
      method: 'DELETE',
      authorization,
    });

    return true;
  }

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const url = this.buildUrl(path);

    this.logger.debug('Calling backend REST endpoint', 'BackendApiClient', {
      method: options.method,
      url,
      hasAuthorization: Boolean(options.authorization),
    });

    let response: Response;

    try {
      response = await fetch(url, {
        method: options.method,
        headers: {
          ...(options.body
            ? {
                'Content-Type': 'application/json',
              }
            : {}),
          ...(options.authorization
            ? {
                Authorization: options.authorization,
              }
            : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      this.logger.error('Backend REST call failed due to network error', 'BackendApiClient', {
        method: options.method,
        url,
        error,
      });
      throw new ServiceUnavailableException('Backend API is unavailable');
    }

    const responseText = await response.text();
    const responseBody = responseText ? this.parseJson(responseText) : null;

    if (!response.ok) {
      const message = this.extractErrorMessage(responseBody) ?? `Backend API returned status ${response.status}`;

      if (response.status >= 400 && response.status < 500) {
        this.logger.warning('Backend REST call returned client error', 'BackendApiClient', {
          method: options.method,
          url,
          statusCode: response.status,
          message,
        });
      } else {
        this.logger.error('Backend REST call returned server error', 'BackendApiClient', {
          method: options.method,
          url,
          statusCode: response.status,
          message,
          responseBody,
        });
      }

      throw this.mapHttpError(response.status, message);
    }

    this.logger.info('Backend REST call completed successfully', 'BackendApiClient', {
      method: options.method,
      url,
      statusCode: response.status,
    });

    return responseBody as T;
  }

  private buildUrl(path: string): string {
    return new URL(path.replace(/^\//, ''), `${getBackendApiUrl()}/`).toString();
  }

  private parseJson(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private extractErrorMessage(responseBody: unknown): string | null {
    if (!responseBody || typeof responseBody !== 'object') {
      return null;
    }

    if ('message' in responseBody && typeof responseBody.message === 'string') {
      return responseBody.message;
    }

    if (
      'message' in responseBody &&
      Array.isArray(responseBody.message) &&
      responseBody.message.every((item) => typeof item === 'string')
    ) {
      return responseBody.message.join('; ');
    }

    return null;
  }

  private mapHttpError(statusCode: number, message: string): Error {
    switch (statusCode) {
      case 400:
        return new BadRequestException(message);
      case 401:
        return new UnauthorizedException(message);
      case 403:
        return new ForbiddenException(message);
      case 404:
        return new NotFoundException(message);
      case 409:
        return new ConflictException(message);
      default:
        return statusCode >= 500 ? new BadGatewayException(message) : new ServiceUnavailableException(message);
    }
  }

  private normalizeLimit(limit: number | undefined): number {
    if (limit === undefined || limit === null) {
      return 50;
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      this.logger.warning('Rejected invalid GraphQL pagination limit', 'BackendApiClient', {
        limit,
      });
      throw new BadRequestException('limit must be a positive integer');
    }

    return limit;
  }

  private resolveCursorStartIndex(messages: Message[], cursor: string | undefined): number {
    if (!cursor) {
      return 0;
    }

    const messageIndex = messages.findIndex((message) => String(message.id) === cursor);

    if (messageIndex === -1) {
      this.logger.warning('Rejected unknown GraphQL pagination cursor', 'BackendApiClient', {
        cursor,
      });
      throw new BadRequestException('Unknown cursor');
    }

    return messageIndex + 1;
  }
}
