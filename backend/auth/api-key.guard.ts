// backend/src/auth/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private config: ConfigService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-api-key'] || req.query?.api_key;
    const expected = this.config.get<string>('API_SECRET_KEY');
    if (key && key === expected) return true;
    throw new UnauthorizedException('API key inválida');
  }
}
