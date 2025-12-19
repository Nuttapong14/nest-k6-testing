import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      issuer: 'constitution-app',
      audience: 'constitution-app-users',
    });
  }

  async validate(payload: any) {
    // The payload has been verified by JWT strategy
    // Now we can check if the user is still active and valid
    const user = await this.authService.validateUserById(payload.sub);

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: payload.roles,
      lastLoginAt: new Date().toISOString(),
    };
  }
}
