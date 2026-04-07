import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { KeycloakAuthService } from '../auth/keycloak/keycloak-auth.service';
import { LoginRequestDto } from '../dto/request/login.request.dto';
import { RegisterRequestDto } from '../dto/request/register.request.dto';
import { AuthLoginResponseDto } from '../dto/response/auth-login.response.dto';
import { UserResponseDto } from '../dto/response/user.response.dto';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly keycloakAuthService: KeycloakAuthService) {}

  @Post('register')
  async register(@Body() body: RegisterRequestDto): Promise<UserResponseDto> {
    const user = await this.keycloakAuthService.register({
      name: body.name,
      email: body.email,
      password: body.password,
    });

    return UserResponseDto.fromDomain(user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequestDto): Promise<AuthLoginResponseDto> {
    const token = await this.keycloakAuthService.login({
      email: body.email,
      password: body.password,
    });

    return AuthLoginResponseDto.fromResult(token);
  }
}
