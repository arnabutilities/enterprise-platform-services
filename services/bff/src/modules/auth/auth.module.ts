import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PkceSessionService } from './pkce-session.service';
import { UserValidationService } from './user-validation.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') ?? 'development-secret',
        signOptions: {
          expiresIn: (configService.get<string>('jwt.expiresIn') ?? '1h') as
            | `${number}m`
            | `${number}h`
            | `${number}d`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PkceSessionService, UserValidationService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthFeatureModule {}
