import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const token = this.authService.login(dto.email, dto.password);
    response.cookie('portfolio_admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      maxAge: (this.config.get<number>('SESSION_TTL_SECONDS') ?? 28800) * 1000,
      path: '/',
    });
    return { ok: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('portfolio_admin_session', { path: '/' });
    return { ok: true };
  }

  @Get('session')
  session(@Req() request: Request & { admin?: { email: string } }) {
    return { authenticated: true, email: request.admin?.email };
  }
}
