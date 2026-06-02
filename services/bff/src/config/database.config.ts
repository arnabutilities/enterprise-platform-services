import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.database'),
  entities: ['dist/**/*.entity.js'],
  synchronize: configService.get('database.synchronize'),
  logging: configService.get('database.logging'),
  maxQueryExecutionTime: 60000,
  extra: {
    max: 100,
    min: 10,
    connectionTimeoutMillis: 5000,
  },
});
