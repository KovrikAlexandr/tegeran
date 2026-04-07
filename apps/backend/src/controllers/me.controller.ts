import { Controller, Get } from '@nestjs/common';

import { RequestCurrentUser } from '../auth/request-current-user';
import { UserResponseDto } from '../dto/response/user.response.dto';
import { CurrentUser } from '../domain/current-user';
import { UsersService } from '../services/users.service';

@Controller('me')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getMe(@RequestCurrentUser() currentUser: CurrentUser): Promise<UserResponseDto> {
    const user = await this.usersService.getByAuthSubject(currentUser.authSubject);

    if (!user) {
      throw new Error(`Current user with authSubject "${currentUser.authSubject}" was not provisioned`);
    }

    return UserResponseDto.fromDomain(user);
  }
}
