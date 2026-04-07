import { User } from '../../domain/models';

export class UserResponseDto {
  id!: number;
  authSubject!: string;
  name!: string;
  email!: string;

  static fromDomain(user: User): UserResponseDto {
    return {
      id: user.id,
      authSubject: user.authSubject,
      name: user.name,
      email: user.email,
    };
  }
}
