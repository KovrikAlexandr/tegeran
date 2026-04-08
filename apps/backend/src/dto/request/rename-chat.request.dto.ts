import { IsString, MinLength } from 'class-validator';

export class RenameChatRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
