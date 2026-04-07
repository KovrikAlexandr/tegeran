import { IsString, MinLength } from 'class-validator';

export class SendMessageRequestDto {
  @IsString()
  @MinLength(1)
  content!: string;
}
