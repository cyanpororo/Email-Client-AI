import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { GmailModule } from './gmail/gmail.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute in milliseconds
        limit: 100, // 100 requests per minute
      },
      {
        name: 'strict',
        ttl: 60000, // 1 minute
        limit: 20, // 20 requests per minute for sensitive endpoints
      },
    ]),
    UserModule,
    AuthModule,
    GmailModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }