import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import { BackendApiClient } from '../backend/backend-api.client';
import { Message, MessageConnection } from '../backend/backend-api.types';
import { getAuthorizationHeader } from '../graphql/auth-header';
import { GraphqlRequestContext } from '../graphql/graphql-context';
import { JsonLogger } from '../logging/json-logger.service';

import { parseGraphqlId } from './resolver-helpers';

type SendMessageInput = {
  chatId: string;
  content: string;
};

@Resolver()
export class MessagesResolver {
  constructor(
    private readonly backendApiClient: BackendApiClient,
    private readonly logger: JsonLogger,
  ) {}

  @Query('messages')
  messages(
    @Args('chatId') chatId: string,
    @Args('limit') limit: number | undefined,
    @Args('cursor') cursor: string | undefined,
    @Context() context: GraphqlRequestContext,
  ): Promise<MessageConnection> {
    return this.backendApiClient.getMessages(
      parseGraphqlId(chatId, 'chatId'),
      limit,
      cursor,
      getAuthorizationHeader(context, this.logger, 'messages'),
    );
  }

  @Mutation('sendMessage')
  sendMessage(
    @Args('input') input: SendMessageInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<Message> {
    return this.backendApiClient.sendMessage(
      parseGraphqlId(input.chatId, 'chatId'),
      { content: input.content },
      getAuthorizationHeader(context, this.logger, 'sendMessage'),
    );
  }
}
