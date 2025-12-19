import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import type { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      issuer: 'constitution-app',
      audience: 'constitution-app-users',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.headers?.authorization?.replace('Bearer ', '');

    if (!refreshToken) {
      throw new Error('Refresh token not provided');
    }

    // Validate the refresh token
    const user = await this.authService.validateRefreshToken(
      payload.sub,
      refreshToken,
    );

    if (!user || !user.isActive) {
      throw new Error('Invalid or expired refresh token');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: payload.roles,
    };
  }
}
