import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureGraphqlBffApp } from './bootstrap';
import { getBackendApiUrl, getLogLevel, getPort } from './config/runtime-config';
import { JsonLogger } from './logging/json-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const logger = app.get(JsonLogger);

  app.useLogger(logger);

  logger.info('GraphQL-BFF bootstrap started', 'Bootstrap', {
    port: getPort(),
    logLevel: getLogLevel(),
    backendApiUrl: getBackendApiUrl(),
  });

  configureGraphqlBffApp(app);

  await app.listen(getPort());

  logger.info('GraphQL-BFF started', 'Bootstrap', {
    port: getPort(),
    graphqlPath: '/graphql',
    backendApiUrl: getBackendApiUrl(),
  });
}

bootstrap().catch((error) => {
  const logger = new JsonLogger();

  logger.error('GraphQL-BFF failed to start', 'Bootstrap', {
    error,
  });

  process.exitCode = 1;
});
