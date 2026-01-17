import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, data.refreshToken);

    return {
      accessToken: data.accessToken,
      user: data.user,
    };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 Google login attempts per minute
  async googleLogin(
    @Body() googleLoginDto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.googleLogin(googleLoginDto.credential);
    this.setRefreshTokenCookie(res, data.refreshToken);

    return {
      accessToken: data.accessToken,
      user: data.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 refresh attempts per minute
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const data = await this.authService.refreshAccessToken(refreshToken);

    // If a new refresh token is returned (rotation), set it
    // Note: The current service implementation might only return accessToken. 
    // If it returns a new refreshToken, we should update the cookie.
    // Based on previous view_file, refreshAccessToken returns { accessToken }.

    return data;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: isProduction ? 'none' : 'lax', // Must match setting options to clear correctly
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: true, // Always true (works on localhost + HTTPS)
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-site prod, 'lax' for local
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}