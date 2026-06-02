import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';

import configuration from './config/configuration';
import { getDatabaseConfig } from './config/database.config';
import { getRedisConfig } from './config/redis.config';
import { AuthFeatureModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { MicroserviceModule } from './modules/microservice/microservice.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

function databaseImports(): DynamicModule[] {
  if (process.env.SKIP_DATABASE === 'true') {
    return [];
  }

  return [
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
  ];
}

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`, '.env.local'],
    }),

    // Caching
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: getRedisConfig,
      inject: [ConfigService],
    }),

    ...databaseImports(),

    // Authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Feature modules
    AuthFeatureModule,
    UsersModule,
    AnalyticsModule,
    HealthModule,
    MicroserviceModule,
    WebsocketModule,
  ],
})
export class AppModule {}
