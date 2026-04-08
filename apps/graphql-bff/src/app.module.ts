import { join } from 'node:path';

import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';

import { BackendApiClient } from './backend/backend-api.client';
import { AuthResolver } from './resolvers/auth.resolver';
import { ChatsResolver } from './resolvers/chats.resolver';
import { HealthResolver } from './resolvers/health.resolver';
import { MessagesResolver } from './resolvers/messages.resolver';
import { UsersResolver } from './resolvers/users.resolver';
import { JsonLogger } from './logging/json-logger.service';
import { GraphqlLoggingInterceptor } from './logging/graphql-logging.interceptor';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',
      typePaths: [join(process.cwd(), 'src/schema/**/*.graphql')],
      sortSchema: true,
      introspection: true,
      context: ({ req }: { req: { headers: { authorization?: string } } }) => ({
        authorization: req.headers.authorization,
      }),
    }),
  ],
  providers: [
    JsonLogger,
    BackendApiClient,
    HealthResolver,
    AuthResolver,
    UsersResolver,
    ChatsResolver,
    MessagesResolver,
    {
      provide: APP_INTERCEPTOR,
      useClass: GraphqlLoggingInterceptor,
    },
  ],
})
export class AppModule {}
