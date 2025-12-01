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
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: true, // Always true since we are using https or localhost
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}