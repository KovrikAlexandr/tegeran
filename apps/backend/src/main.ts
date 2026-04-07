import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureHttpApp } from './bootstrap';
import { getPort } from './config/runtime-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureHttpApp(app);
  await app.listen(getPort());
}

void bootstrap();
