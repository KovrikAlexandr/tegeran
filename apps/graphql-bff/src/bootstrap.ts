import { INestApplication } from '@nestjs/common';

export function configureGraphqlBffApp(app: INestApplication): void {
  app.enableCors();
}
