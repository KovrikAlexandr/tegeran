import { Query, Resolver } from '@nestjs/graphql';

import { BackendApiClient } from '../backend/backend-api.client';
import { HealthResponse } from '../backend/backend-api.types';

@Resolver()
export class HealthResolver {
  constructor(private readonly backendApiClient: BackendApiClient) {}

  @Query('health')
  health(): Promise<HealthResponse> {
    return this.backendApiClient.health();
  }
}
