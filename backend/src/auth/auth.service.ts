import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../auth/dto/login.dto';
import { jwtConstants } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const supabase = this.supabaseService.getClient();

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password, role')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Prevent bcrypt.compare from receiving null/undefined when account has no password
      if (!user.password) {
        // Keep response generic for security (do not reveal account type)
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload, {
        secret: jwtConstants.accessTokenSecret,
        expiresIn: jwtConstants.accessTokenExpiry,
      });
      const refreshToken = this.jwtService.sign(payload, {
        secret: jwtConstants.refreshTokenSecret,
        expiresIn: jwtConstants.refreshTokenExpiry,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Login error:', error);
      throw new InternalServerErrorException('Login failed');
    }
  }

  async googleLogin(credential: string) {
    try {
      // Verify Google token with proper validation
      const ticket = await this.verifyGoogleToken(credential);
      const { email, sub: googleId, name } = ticket;

      if (!email) {
        throw new BadRequestException('Email not provided by Google');
      }

      const supabase = this.supabaseService.getClient();

      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, email, role, google_id')
        .eq('email', email)
        .single();

      let user;

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Database fetch error:', fetchError);
        throw new InternalServerErrorException('Failed to check existing user');
      }

      if (existingUser) {
        // Update google_id if not set
        if (!existingUser.google_id) {
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ google_id: googleId })
            .eq('id', existingUser.id)
            .select('id, email, role, google_id')
            .single();

          if (updateError) {
            console.error('Update google_id error:', updateError);
            throw new InternalServerErrorException('Failed to update user');
          }

          user = updatedUser;
        } else {
          user = existingUser;
        }
      } else {
        // Create new user
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              email,
              google_id: googleId,
              role: 'user',
              password: null, // Google users don't have password
            },
          ])
          .select('id, email, role, google_id')
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            throw new BadRequestException('Email already exists');
          }
          console.error('Insert user error:', insertError);
          throw new InternalServerErrorException('Failed to create user');
        }

        user = newUser;
      }

      // Generate tokens
      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload, {
        secret: jwtConstants.accessTokenSecret,
        expiresIn: jwtConstants.accessTokenExpiry,
      });
      const refreshToken = this.jwtService.sign(payload, {
        secret: jwtConstants.refreshTokenSecret,
        expiresIn: jwtConstants.refreshTokenExpiry,
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Google login error:', error);
      throw new InternalServerErrorException('Google login failed');
    }
  }

  private async verifyGoogleToken(credential: string): Promise<{
    email: string;
    sub: string;
    name?: string;
  }> {
    try {
      // Verify token with Google's tokeninfo endpoint
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const data = await response.json();

      // Verify the token is for your app
      const expectedAudience = process.env.GOOGLE_CLIENT_ID;
      if (data.aud !== expectedAudience) {
        throw new UnauthorizedException('Token audience mismatch');
      }

      // Check if token is expired
      if (data.exp && parseInt(data.exp) < Date.now() / 1000) {
        throw new UnauthorizedException('Token expired');
      }

      if (!data.email || !data.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        email: data.email,
        sub: data.sub,
        name: data.name,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Token verification error:', error);
      throw new UnauthorizedException('Failed to verify Google credential');
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtConstants.refreshTokenSecret,
      });

      const newPayload = { sub: payload.sub, email: payload.email, role: payload.role };
      const accessToken = this.jwtService.sign(newPayload, {
        secret: jwtConstants.accessTokenSecret,
        expiresIn: jwtConstants.accessTokenExpiry,
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw new InternalServerErrorException('Failed to fetch user profile');
    }
  }
}