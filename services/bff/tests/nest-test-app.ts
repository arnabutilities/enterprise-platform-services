process.env.USE_MEMORY_CACHE = 'true';
process.env.SKIP_DATABASE = 'true';
process.env.DEMO_ALLOWED_EMAILS =
  process.env.DEMO_ALLOWED_EMAILS ?? 'test@example.com,admin@example.com';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AuthExceptionFilter } from '../src/modules/auth/filters/auth-exception.filter';

export async function createNestTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalFilters(new AuthExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
