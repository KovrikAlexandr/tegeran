import { IsEmail } from 'class-validator';

export class RemoveChatMemberByEmailRequestDto {
  @IsEmail()
  email!: string;
}
