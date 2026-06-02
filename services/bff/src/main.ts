import './load-env';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AuthExceptionFilter } from './modules/auth/filters/auth-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestValidationMiddleware } from './common/middleware/request-validation.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AuthExceptionFilter());

  // Security middleware
  app.use(helmet());
  app.use(cookieParser());

  // Custom middleware
  app.use(new RequestIdMiddleware().use.bind(new RequestIdMiddleware()));
  app.use(new RequestValidationMiddleware().use.bind(new RequestValidationMiddleware()));
  app.use(new SecurityHeadersMiddleware().use.bind(new SecurityHeadersMiddleware()));

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const firstMessage = errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .find(Boolean);

        return new BadRequestException({
          code: 'INVALID_INPUT',
          message: firstMessage ?? 'Invalid request payload',
          timestamp: new Date().toISOString(),
        });
      },
    }),
  );

  // CORS
  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) ?? [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5003',
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`✅ BFF Server running on http://localhost:${port}`);
  console.log(`🔐 Auth API: http://localhost:${port}/api/auth/initiate`);
}

bootstrap();
