import { graphqlRequest } from '@/lib/graphql/client';
import { LOGIN_MUTATION, REGISTER_MUTATION } from '@/lib/graphql/operations';
import { LoginResult, User } from '@/lib/types';

interface RegisterResponse {
  register: User;
}

interface LoginResponse {
  login: LoginResult;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const data = await graphqlRequest<RegisterResponse, { input: typeof input }>(REGISTER_MUTATION, {
    input,
  });

  return data.register;
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const data = await graphqlRequest<LoginResponse, { input: typeof input }>(LOGIN_MUTATION, {
    input,
  });

  return data.login;
}
