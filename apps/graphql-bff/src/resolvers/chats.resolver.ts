import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import { BackendApiClient } from '../backend/backend-api.client';
import { Chat, ChatMember } from '../backend/backend-api.types';
import { getAuthorizationHeader } from '../graphql/auth-header';
import { GraphqlRequestContext } from '../graphql/graphql-context';
import { JsonLogger } from '../logging/json-logger.service';

import { parseGraphqlId } from './resolver-helpers';

type DirectChatInput = {
  email: string;
};

type CreateGroupChatInput = {
  name: string;
  memberEmails: string[];
};

type RenameGroupChatInput = {
  chatId: string;
  name: string;
};

type AddMemberToChatInput = {
  chatId: string;
  userId: string;
};

type RemoveMemberFromChatInput = {
  chatId: string;
  email: string;
};

@Resolver()
export class ChatsResolver {
  constructor(
    private readonly backendApiClient: BackendApiClient,
    private readonly logger: JsonLogger,
  ) {}

  @Query('chats')
  chats(@Context() context: GraphqlRequestContext): Promise<Chat[]> {
    return this.backendApiClient.getChats(getAuthorizationHeader(context, this.logger, 'chats'));
  }

  @Query('chat')
  chat(
    @Args('id') id: string,
    @Context() context: GraphqlRequestContext,
  ): Promise<Chat> {
    return this.backendApiClient.getChat(
      parseGraphqlId(id, 'id'),
      getAuthorizationHeader(context, this.logger, 'chat'),
    );
  }

  @Query('chatMembers')
  chatMembers(
    @Args('chatId') chatId: string,
    @Context() context: GraphqlRequestContext,
  ): Promise<ChatMember[]> {
    return this.backendApiClient.getChatMembers(
      parseGraphqlId(chatId, 'chatId'),
      getAuthorizationHeader(context, this.logger, 'chatMembers'),
    );
  }

  @Mutation('getOrCreateDirectChat')
  getOrCreateDirectChat(
    @Args('input') input: DirectChatInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<Chat> {
    return this.backendApiClient.getOrCreateDirectChatByEmail(
      input,
      getAuthorizationHeader(context, this.logger, 'getOrCreateDirectChat'),
    );
  }

  @Mutation('createGroupChat')
  createGroupChat(
    @Args('input') input: CreateGroupChatInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<Chat> {
    return this.backendApiClient.createGroupChat(
      input,
      getAuthorizationHeader(context, this.logger, 'createGroupChat'),
    );
  }

  @Mutation('renameGroupChat')
  renameGroupChat(
    @Args('input') input: RenameGroupChatInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<Chat> {
    return this.backendApiClient.renameGroupChat(
      parseGraphqlId(input.chatId, 'chatId'),
      { name: input.name },
      getAuthorizationHeader(context, this.logger, 'renameGroupChat'),
    );
  }

  @Mutation('addMemberToChat')
  addMemberToChat(
    @Args('input') input: AddMemberToChatInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<ChatMember> {
    return this.backendApiClient.addMemberToChat(
      parseGraphqlId(input.chatId, 'chatId'),
      {
        userId: parseGraphqlId(input.userId, 'userId'),
      },
      getAuthorizationHeader(context, this.logger, 'addMemberToChat'),
    );
  }

  @Mutation('removeMemberFromChat')
  removeMemberFromChat(
    @Args('input') input: RemoveMemberFromChatInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<boolean> {
    return this.backendApiClient.removeMemberFromChatByEmail(
      parseGraphqlId(input.chatId, 'chatId'),
      { email: input.email },
      getAuthorizationHeader(context, this.logger, 'removeMemberFromChat'),
    );
  }

  @Mutation('leaveChat')
  leaveChat(
    @Args('chatId') chatId: string,
    @Context() context: GraphqlRequestContext,
  ): Promise<boolean> {
    return this.backendApiClient.leaveChat(
      parseGraphqlId(chatId, 'chatId'),
      getAuthorizationHeader(context, this.logger, 'leaveChat'),
    );
  }

  @Mutation('deleteChat')
  deleteChat(
    @Args('chatId') chatId: string,
    @Context() context: GraphqlRequestContext,
  ): Promise<boolean> {
    return this.backendApiClient.deleteChat(
      parseGraphqlId(chatId, 'chatId'),
      getAuthorizationHeader(context, this.logger, 'deleteChat'),
    );
  }
}
