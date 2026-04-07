import { ArrayUnique, IsArray, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateGroupChatRequestDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  memberUserIds!: number[];
}
