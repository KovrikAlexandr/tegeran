import { INestApplication, ValidationPipe } from '@nestjs/common';

import { DomainExceptionFilter } from './filters/domain-exception.filter';

export function configureHttpApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
}
