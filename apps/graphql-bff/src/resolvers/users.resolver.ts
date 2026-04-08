import { Context } from '@nestjs/graphql';
import { Query, Resolver } from '@nestjs/graphql';

import { BackendApiClient } from '../backend/backend-api.client';
import { User } from '../backend/backend-api.types';
import { GraphqlRequestContext } from '../graphql/graphql-context';
import { getAuthorizationHeader } from '../graphql/auth-header';
import { JsonLogger } from '../logging/json-logger.service';

@Resolver()
export class UsersResolver {
  constructor(
    private readonly backendApiClient: BackendApiClient,
    private readonly logger: JsonLogger,
  ) {}

  @Query('me')
  me(@Context() context: GraphqlRequestContext): Promise<User> {
    return this.backendApiClient.getMe(getAuthorizationHeader(context, this.logger, 'me'));
  }
}
