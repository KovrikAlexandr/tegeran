import { IsInt, Min } from 'class-validator';

export class AddChatMemberRequestDto {
  @IsInt()
  @Min(1)
  userId!: number;
}
