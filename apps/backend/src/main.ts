import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureHttpApp } from './bootstrap';
import { getLogLevel, getPort, isAuthEnabled } from './config/runtime-config';
import { JsonLogger } from './logging/json-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const logger = app.get(JsonLogger);

  app.useLogger(logger);

  logger.info('Backend bootstrap started', 'Bootstrap', {
    logLevel: getLogLevel(),
    authEnabled: isAuthEnabled(),
  });

  configureHttpApp(app);
  const port = getPort();

  logger.info('Starting HTTP server', 'Bootstrap', {
    port,
    authEnabled: isAuthEnabled(),
  });

  await app.listen(port, '0.0.0.0');

  logger.info('Backend service started', 'Bootstrap', {
    port,
    logLevel: getLogLevel(),
    authEnabled: isAuthEnabled(),
  });
}

void bootstrap().catch((error: unknown) => {
  const logger = new JsonLogger();
  logger.error('Backend bootstrap failed', 'Bootstrap', {
    error,
  });
  process.exit(1);
});
