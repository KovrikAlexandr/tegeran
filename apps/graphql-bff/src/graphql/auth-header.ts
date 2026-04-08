import { JsonLogger } from '../logging/json-logger.service';

import { GraphqlRequestContext } from './graphql-context';

export function getAuthorizationHeader(
  context: GraphqlRequestContext,
  logger: JsonLogger,
  operationName: string,
): string | undefined {
  const authorization = context.authorization;

  if (!authorization) {
    logger.warning('Missing Authorization header for GraphQL operation', 'AuthHeader', {
      operationName,
    });
    return undefined;
  }

  if (!/^Bearer\s+\S+/i.test(authorization)) {
    logger.warning('Malformed Authorization header for GraphQL operation', 'AuthHeader', {
      operationName,
    });
  }

  return authorization;
}
