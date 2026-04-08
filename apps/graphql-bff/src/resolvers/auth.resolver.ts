import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { BackendApiClient } from '../backend/backend-api.client';
import { LoginResult, User } from '../backend/backend-api.types';

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

@Resolver()
export class AuthResolver {
  constructor(private readonly backendApiClient: BackendApiClient) {}

  @Mutation('register')
  register(@Args('input') input: RegisterInput): Promise<User> {
    return this.backendApiClient.register(input);
  }

  @Mutation('login')
  login(@Args('input') input: LoginInput): Promise<LoginResult> {
    return this.backendApiClient.login(input);
  }
}
