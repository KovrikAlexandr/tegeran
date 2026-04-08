import { IsArray, IsEmail, IsString, MinLength } from 'class-validator';

export class CreateGroupChatRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @IsEmail({}, { each: true })
  memberEmails!: string[];
}
