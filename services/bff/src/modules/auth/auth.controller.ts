import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import type { AuthUser } from '@enterprise-platform/contracts';
import { getAuthMetricsSnapshot } from '@enterprise-platform/observability';
import { AuthService } from './auth.service';
import { ExchangePkceDto } from './dto/exchange-pkce.dto';
import { InitiatePkceDto } from './dto/initiate-pkce.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('initiate')
  @HttpCode(200)
  initiate(@Body() dto: InitiatePkceDto) {
    return this.authService.initiatePkce(dto);
  }

  @Post('exchange')
  @HttpCode(200)
  async exchange(@Body() dto: ExchangePkceDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.exchangePkce(dto);
    this.setAccessTokenCookie(res, result.accessToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: AuthUser }) {
    return req.user;
  }

  @Get('metrics')
  authMetrics() {
    return getAuthMetricsSnapshot();
  }

  private setAccessTokenCookie(res: Response, accessToken: string): void {
    const cookieName =
      this.configService.get<string>('auth.accessTokenCookieName') ?? 'accessToken';
    const isProduction = this.configService.get<string>('app.environment') === 'production';

    res.cookie(cookieName, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });
  }
}
