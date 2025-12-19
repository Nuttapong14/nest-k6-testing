import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context) {
    // Add any additional validation logic here if needed
    return super.canActivate(context);
  }

  // Override handleRequest to add custom error messages
  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new Error('Unauthorized access - invalid or missing token');
    }
    return user;
  }
}
