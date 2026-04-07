import { IsInt, Min } from 'class-validator';

export class CreateDirectChatRequestDto {
  @IsInt()
  @Min(1)
  peerUserId!: number;
}
