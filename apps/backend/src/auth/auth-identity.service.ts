import { Injectable, UnauthorizedException } from '@nestjs/common';

import { CurrentUser } from '../domain/current-user';
import { UsersService } from '../services/users.service';
import { getMockUserConfig, isAuthEnabled } from '../config/runtime-config';

interface CurrentUserProfile {
  currentUser: CurrentUser;
  name: string;
  email: string;
}

@Injectable()
export class AuthIdentityService {
  constructor(private readonly usersService: UsersService) {}

  isAuthEnabled(): boolean {
    return isAuthEnabled();
  }

  async resolveCurrentUser(authorizationHeader?: string): Promise<CurrentUser> {
    const profile = this.isAuthEnabled()
      ? this.resolveAuthenticatedProfile(authorizationHeader)
      : this.resolveMockProfile();

    await this.usersService.getOrCreateCurrentUser({
      currentUser: profile.currentUser,
      name: profile.name,
      email: profile.email,
    });

    return profile.currentUser;
  }

  private resolveMockProfile(): CurrentUserProfile {
    const mockUser = getMockUserConfig();

    return {
      currentUser: {
        authSubject: mockUser.authSubject,
      },
      name: mockUser.name,
      email: mockUser.email,
    };
  }

  private resolveAuthenticatedProfile(authorizationHeader?: string): CurrentUserProfile {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization header must use Bearer token');
    }

    const authSubject = this.extractAuthSubject(token);

    if (!authSubject) {
      throw new UnauthorizedException('Unable to resolve auth subject from token');
    }

    return {
      currentUser: { authSubject },
      name: authSubject,
      email: this.buildSyntheticEmail(authSubject),
    };
  }

  private extractAuthSubject(token: string): string {
    const parts = token.split('.');

    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: unknown };

        if (typeof payload.sub === 'string' && payload.sub.trim()) {
          return payload.sub.trim();
        }
      } catch {
        return token.trim();
      }
    }

    return token.trim();
  }

  private buildSyntheticEmail(authSubject: string): string {
    const suffix = Buffer.from(authSubject).toString('hex').slice(0, 32) || 'user';
    return `user-${suffix}@auth.local`;
  }
}
