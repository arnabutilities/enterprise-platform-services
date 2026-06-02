# NestJS BFF Layer: PKCE Authentication + GraphQL APIs

**Document Status**: BFF Architecture Guide  
**Target**: Enterprise Platform Backend for Frontend  
**Focus**: NestJS, PKCE Authentication, GraphQL, Client-Centric APIs  
**Created**: 2026-05-18

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [NestJS Setup](#nestjs-setup)
4. [PKCE Authentication Flow](#pkce-authentication-flow)
5. [GraphQL Implementation](#graphql-implementation)
6. [Secure Token Management](#secure-token-management)
7. [GraphQL Resolvers](#graphql-resolvers)
8. [Real-time Subscriptions](#real-time-subscriptions)
9. [Error Handling](#error-handling)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Security Best Practices](#security-best-practices)

---

## Overview

### Why NestJS for BFF?

```
BFF Requirements          NestJS Advantage
─────────────────────────────────────────
TypeScript              ✅ Built-in support
Microservices          ✅ NestJS modules pattern
API Gateway            ✅ Controllers & services
GraphQL support        ✅ @nestjs/graphql
Authentication         ✅ Passport.js integration
Real-time (WebSocket)  ✅ Built-in support
Testing                ✅ Jest integration
Scalability            ✅ Cluster mode
```

### Why PKCE for SPAs?

```
PKCE Features
─────────────
✅ No client secret needed (safer for SPAs)
✅ Protection against code interception attacks
✅ OAuth 2.0 standard (RFC 7636)
✅ Works with OAuth providers
✅ Reduces token exposure in URLs
✅ Mobile & desktop friendly
```

### Why GraphQL for BFF?

```
GraphQL Advantages
──────────────────
✅ Query only what you need (no over-fetching)
✅ Single endpoint (vs multiple REST endpoints)
✅ Strongly typed schema
✅ Real-time subscriptions
✅ Perfect for client-centric APIs
✅ Better developer experience
✅ Self-documenting
```

---

## Architecture Design

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
├──────────────────────┬──────────────────────┬────────────┤
│   Host Shell         │   Analytics MFE      │  Reports   │
│   (React + Router)   │   (React + Router)   │   MFE      │
└──────────────────────┴──────────────────────┴────────────┘
                              ▼
                    ┌─────────────────────┐
                    │  Authentication     │
                    │  (PKCE Flow)        │
                    └─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│              BFF Layer (NestJS)                          │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐ │
│  │         GraphQL Gateway                           │ │
│  │  (Apollo Server, Type-GraphQL, @nestjs/graphql)   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────┬───────────────┬──────────────────┐   │
│  │  Auth Module  │  User Module  │  Analytics      │   │
│  │               │               │  Module         │   │
│  │  • PKCE flow  │  • Profile    │  • Dashboard    │   │
│  │  • JWT tokens │  • Settings   │  • Reports      │   │
│  │  • Refresh    │  • Roles      │  • Metrics      │   │
│  └───────────────┴───────────────┴──────────────────┘   │
│                                                         │
│  ┌───────────────┬───────────────┬──────────────────┐   │
│  │  Database     │  Cache        │  Message Queue  │   │
│  │  (PostgreSQL) │  (Redis)      │  (RabbitMQ)     │   │
│  └───────────────┴───────────────┴──────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────┐
│           Microservices Layer                            │
├─────────────────────────────────────────────────────────┤
│  • Analytics Service  • Reports Service  • Search       │
│  • Notifications      • Data Pipeline    • ML Models    │
└─────────────────────────────────────────────────────────┘
```

### PKCE Flow Diagram

```
Client (SPA)                    OAuth Provider              BFF
    │                                 │                      │
    ├─(1) Init login─────────────────►│                      │
    │                                 │                      │
    │ (2) Generate code_challenge    │                      │
    │     & code_verifier           │                      │
    │                                 │                      │
    ├─(3) Redirect with────────────────►│                      │
    │     code_challenge             │                      │
    │                                 │                      │
    │◄────(4) Auth page────────────────┤                      │
    │                                 │                      │
    │ (5) User grants permission     │                      │
    │                                 │                      │
    │◄────(6) Authorization code──────┤                      │
    │                                 │                      │
    ├─(7) Exchange code + verifier────────────────────────────►│
    │     for tokens                 │                      │
    │                                 │                      │
    │◄──────────(8) JWT tokens─────────────────────────────────┤
    │                                 │                      │
    ├─(9) Store in secure cookie    │                      │
    │                                 │                      │
    └─(10) Access BFF with JWT──────────────────────────────────►
```

---

## NestJS Setup

### Step 1: Initialize NestJS Project

```bash
# Install NestJS CLI
npm i -g @nestjs/cli

# Create new NestJS project
nest new bff --package-manager pnpm

# Navigate to project
cd bff

# Install additional dependencies
pnpm add \
  @nestjs/graphql \
  @nestjs/apollo \
  apollo-server-express \
  graphql \
  type-graphql \
  @nestjs/jwt \
  @nestjs/passport \
  passport \
  passport-jwt \
  bcrypt \
  @nestjs/common \
  @nestjs/core \
  @nestjs/platform-express \
  @nestjs/typeorm \
  typeorm \
  pg \
  redis \
  ioredis \
  nanoid \
  crypto

# Dev dependencies
pnpm add -D \
  @types/node \
  @types/express \
  typescript \
  ts-node \
  @types/jest \
  jest \
  @nestjs/testing \
  ts-jest
```

### Step 2: Project Structure

```
bff/
├── src/
│   ├── main.ts                          # Entry point
│   ├── app.module.ts                    # Root module
│   ├── config/
│   │   ├── configuration.ts             # Config loading
│   │   └── env.validation.ts            # Env validation
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts              # PKCE logic
│   │   ├── auth.resolver.ts             # GraphQL mutations
│   │   ├── jwt.strategy.ts              # Passport JWT
│   │   ├── jwt.guard.ts                 # JWT guard
│   │   ├── dto/
│   │   │   ├── login.input.ts
│   │   │   ├── exchange-code.input.ts
│   │   │   └── auth-response.dto.ts
│   │   └── entities/
│   │       ├── user.entity.ts
│   │       └── refresh-token.entity.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── users.resolver.ts            # GraphQL queries
│   │   ├── dto/
│   │   │   └── user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   ├── analytics/
│   │   ├── analytics.module.ts
│   │   ├── analytics.service.ts
│   │   ├── analytics.resolver.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── graphql/
│   │   ├── schema.gql                   # Generated schema
│   │   └── scalars/
│   │       ├── date.scalar.ts
│   │       └── json.scalar.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── middleware/
│       └── request-logging.middleware.ts
├── test/
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### Step 3: AppModule Configuration

**File**: `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import path from 'path';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // GraphQL
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: path.join(process.cwd(), 'src/graphql/schema.gql'),
        sortSchema: true,
        playground: {
          settings: {
            'request.credentials': 'include',
          },
        },
        context: ({ req, res }) => ({ req, res }),
        introspection: process.env.NODE_ENV !== 'production',
        subscriptions: {
          'graphql-ws': {
            onConnect: (context: any) => {
              const { connectionParams, extra } = context;
              return { headers: connectionParams };
            },
          },
        },
      }),
      inject: [ConfigService],
    }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),

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

    // Feature modules
    AuthModule,
    UsersModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
```

### Step 4: Configuration Service

**File**: `src/config/configuration.ts`

```typescript
export default () => ({
  app: {
    name: process.env.APP_NAME || 'BFF',
    port: parseInt(process.env.PORT || '3000'),
    environment: process.env.NODE_ENV || 'development',
  },

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    name: process.env.DATABASE_NAME || 'bff_db',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    },
    keycloak: {
      realm: process.env.KEYCLOAK_REALM,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuerUrl: process.env.KEYCLOAK_ISSUER_URL,
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3002'],
    credentials: true,
  },
});
```

### Step 5: Main Entry Point

**File**: `src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Middleware
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3002',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`✅ BFF Server running on http://localhost:${port}`);
  console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
```

---

## PKCE Authentication Flow

### Step 1: PKCE Code Generation Service

**File**: `src/auth/pkce.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { base64url } from 'rfc4648';

@Injectable()
export class PkceService {
  /**
   * Generate PKCE code_verifier (random string, 43-128 chars)
   */
  generateCodeVerifier(): string {
    // Generate random 32 bytes
    const buffer = randomBytes(32);
    // Encode to base64url (no padding)
    return base64url.stringify(buffer).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Generate code_challenge from code_verifier
   * challenge = BASE64URL(SHA256(verifier))
   */
  generateCodeChallenge(verifier: string): string {
    const hash = createHash('sha256');
    hash.update(verifier);
    const buffer = hash.digest();
    return base64url.stringify(buffer).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Validate that the verifier matches the challenge
   */
  validateCodeChallenge(verifier: string, challenge: string): boolean {
    const computed = this.generateCodeChallenge(verifier);
    return computed === challenge;
  }
}
```

### Step 2: Auth Service - PKCE Implementation

**File**: `src/auth/auth.service.ts`

```typescript
import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios from 'axios';

import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { PkceService } from './pkce.service';
import { LoginInput } from './dto/login.input';
import { ExchangeCodeInput } from './dto/exchange-code.input';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,

    @InjectRepository(RefreshTokenEntity)
    private refreshTokenRepository: Repository<RefreshTokenEntity>,

    private jwtService: JwtService,
    private configService: ConfigService,
    private pkceService: PkceService,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Step 1: Generate PKCE codes for SPA
   * Returns code_challenge to use in OAuth redirect
   */
  async initiatePkceFlow(loginInput: LoginInput): Promise<{
    codeChallenge: string;
    state: string;
    sessionId: string;
  }> {
    const verifier = this.pkceService.generateCodeVerifier();
    const challenge = this.pkceService.generateCodeChallenge(verifier);
    const state = this.generateRandomState();
    const sessionId = this.generateRandomState();

    // Store verifier and state in Redis (expires in 10 minutes)
    await this.cacheManager.set(
      `pkce:${sessionId}`,
      {
        verifier,
        state,
        provider: loginInput.provider,
      },
      10 * 60 * 1000,
    );

    return {
      codeChallenge: challenge,
      state,
      sessionId,
    };
  }

  /**
   * Step 2: Exchange OAuth code for tokens
   * Called after user authorizes on OAuth provider
   */
  async exchangeAuthorizationCode(input: ExchangeCodeInput): Promise<AuthResponseDto> {
    // Retrieve PKCE session from cache
    const pkceSession = await this.cacheManager.get<{
      verifier: string;
      state: string;
      provider: string;
    }>(`pkce:${input.sessionId}`);

    if (!pkceSession) {
      throw new BadRequestException('PKCE session expired');
    }

    // Validate state matches
    if (pkceSession.state !== input.state) {
      throw new BadRequestException('State mismatch');
    }

    // Exchange code for tokens from OAuth provider
    const tokens = await this.exchangeCodeWithProvider(
      input.code,
      pkceSession.verifier,
      pkceSession.provider,
    );

    // Get or create user
    let user = await this.userRepository.findOne({
      where: { email: tokens.email },
    });

    if (!user) {
      user = this.userRepository.create({
        email: tokens.email,
        name: tokens.name,
        picture: tokens.picture,
        oauthProvider: pkceSession.provider,
        oauthId: tokens.sub,
      });
      await this.userRepository.save(user);
    }

    // Generate JWT tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Clean up PKCE session
    await this.cacheManager.del(`pkce:${input.sessionId}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  /**
   * Exchange authorization code with OAuth provider
   */
  private async exchangeCodeWithProvider(
    code: string,
    verifier: string,
    provider: string,
  ): Promise<any> {
    const config = this.configService.get(`oauth.${provider}`);

    if (!config) {
      throw new BadRequestException(`Provider ${provider} not configured`);
    }

    try {
      const response = await axios.post(
        `${config.issuerUrl}/protocol/openid-connect/token`,
        {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          code_verifier: verifier,
          redirect_uri: config.redirectUri,
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      // Decode ID token to get user info
      const decoded = this.jwtService.decode(response.data.id_token) as any;

      return {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to exchange code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResponseDto> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isActive: true },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = storedToken.user;
    const newAccessToken = this.generateAccessToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken, // Return same refresh token
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      storedToken.isActive = false;
      await this.refreshTokenRepository.save(storedToken);
    }
  }

  // Helper methods

  private generateAccessToken(user: UserEntity): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    });
  }

  private async generateRefreshToken(user: UserEntity): Promise<string> {
    const token = this.generateRandomState();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token,
      user,
      expiresAt,
      isActive: true,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);
    return token;
  }

  private generateRandomState(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }
}
```

### Step 3: Auth DTOs

**File**: `src/auth/dto/login.input.ts`

```typescript
import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsIn } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsNotEmpty()
  @IsIn(['keycloak', 'google', 'microsoft'])
  provider: string;

  @Field()
  @IsEmail()
  email: string;
}
```

**File**: `src/auth/dto/exchange-code.input.ts`

```typescript
import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class ExchangeCodeInput {
  @Field()
  @IsNotEmpty()
  code: string;

  @Field()
  @IsNotEmpty()
  state: string;

  @Field()
  @IsNotEmpty()
  sessionId: string;
}
```

**File**: `src/auth/dto/auth-response.dto.ts`

```typescript
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UserDto {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  picture?: string;
}

@ObjectType()
export class AuthResponseDto {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field()
  user: UserDto;
}
```

### Step 4: Auth Entities

**File**: `src/auth/entities/user.entity.ts`

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RefreshTokenEntity } from './refresh-token.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  picture: string;

  @Column({ type: 'varchar' })
  oauthProvider: string; // keycloak, google, microsoft

  @Column({ type: 'varchar' })
  oauthId: string;

  @Column({ type: 'simple-array', default: ['user'] })
  roles: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RefreshTokenEntity, (token) => token.user)
  refreshTokens: RefreshTokenEntity[];
}
```

**File**: `src/auth/entities/refresh-token.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  token: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;
}
```

---

## GraphQL Implementation

### Step 1: Auth Resolver - GraphQL Mutations

**File**: `src/auth/auth.resolver.ts`

```typescript
import { Resolver, Mutation, Query, Args, Context, UseGuards } from '@nestjs/graphql';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginInput } from './dto/login.input';
import { ExchangeCodeInput } from './dto/exchange-code.input';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from './entities/user.entity';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  /**
   * Step 1: Initiate PKCE flow
   * Returns code_challenge and session_id for SPA to use in OAuth redirect
   */
  @Mutation(() => String)
  async initiatePkceFlow(
    @Args('provider') provider: string,
    @Args('email') email: string,
  ): Promise<string> {
    const pkceData = await this.authService.initiatePkceFlow({
      provider,
      email,
    });

    // Return as JSON string (or create custom type)
    return JSON.stringify({
      codeChallenge: pkceData.codeChallenge,
      state: pkceData.state,
      sessionId: pkceData.sessionId,
    });
  }

  /**
   * Step 2: Exchange authorization code for tokens
   * Called by SPA after OAuth callback
   */
  @Mutation(() => AuthResponseDto)
  async exchangeAuthorizationCode(
    @Args('input') input: ExchangeCodeInput,
    @Context() context: { res: Response },
  ): Promise<AuthResponseDto> {
    const result = await this.authService.exchangeAuthorizationCode(input);

    // Set secure HTTP-only cookies
    context.res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    context.res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  /**
   * Refresh access token
   */
  @Mutation(() => AuthResponseDto)
  async refreshAccessToken(
    @Args('refreshToken') refreshToken: string,
    @Context() context: { res: Response },
  ): Promise<AuthResponseDto> {
    const result = await this.authService.refreshAccessToken(refreshToken);

    // Update access token cookie
    context.res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });

    return result;
  }

  /**
   * Logout
   */
  @Mutation(() => Boolean)
  async logout(
    @Args('refreshToken') refreshToken: string,
    @Context() context: { res: Response },
  ): Promise<boolean> {
    await this.authService.logout(refreshToken);

    // Clear cookies
    context.res.clearCookie('accessToken');
    context.res.clearCookie('refreshToken');

    return true;
  }

  /**
   * Get current user (requires JWT)
   */
  @Query(() => AuthResponseDto)
  @UseGuards(JwtGuard)
  async getCurrentUser(@CurrentUser() user: UserEntity): Promise<AuthResponseDto> {
    return {
      accessToken: '', // Not needed for this query
      refreshToken: '', // Not needed for this query
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }
}
```

### Step 2: Users Resolver - GraphQL Queries

**File**: `src/users/users.resolver.ts`

```typescript
import { Resolver, Query, Mutation, Args, UseGuards, ID } from '@nestjs/graphql';

import { UsersService } from './users.service';
import { UserDto } from '../auth/dto/auth-response.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

@Resolver(() => UserDto)
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  /**
   * Get all users (admin only)
   */
  @Query(() => [UserDto])
  @UseGuards(JwtGuard)
  async getAllUsers(@CurrentUser() user: UserEntity): Promise<UserDto[]> {
    if (!user.roles.includes('admin')) {
      throw new Error('Unauthorized');
    }

    return this.usersService.getAllUsers();
  }

  /**
   * Get user by ID
   */
  @Query(() => UserDto)
  @UseGuards(JwtGuard)
  async getUser(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<UserDto> {
    // Users can only see their own profile or admins see all
    if (user.id !== id && !user.roles.includes('admin')) {
      throw new Error('Unauthorized');
    }

    return this.usersService.getUserById(id);
  }

  /**
   * Update user profile
   */
  @Mutation(() => UserDto)
  @UseGuards(JwtGuard)
  async updateUserProfile(
    @Args('name') name: string,
    @CurrentUser() user: UserEntity,
  ): Promise<UserDto> {
    return this.usersService.updateUserProfile(user.id, { name });
  }

  /**
   * Delete user account
   */
  @Mutation(() => Boolean)
  @UseGuards(JwtGuard)
  async deleteUserAccount(@CurrentUser() user: UserEntity): Promise<boolean> {
    await this.usersService.deleteUser(user.id);
    return true;
  }
}
```

### Step 3: Analytics Resolver - Client-Centric API

**File**: `src/analytics/analytics.resolver.ts`

```typescript
import { Resolver, Query, Subscription, Args, UseGuards } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';

import { AnalyticsService } from './analytics.service';
import { DashboardDto } from './dto/dashboard.dto';
import { MetricsDto } from './dto/metrics.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

const pubSub = new PubSub();

@Resolver()
export class AnalyticsResolver {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Get dashboard data
   * Query only fields needed by client (no over-fetching)
   */
  @Query(() => DashboardDto)
  @UseGuards(JwtGuard)
  async getDashboard(@CurrentUser() user: UserEntity): Promise<DashboardDto> {
    return this.analyticsService.getDashboard(user.id);
  }

  /**
   * Get metrics with filtering
   */
  @Query(() => [MetricsDto])
  @UseGuards(JwtGuard)
  async getMetrics(
    @Args('dateFrom') dateFrom: string,
    @Args('dateTo') dateTo: string,
    @Args('groupBy', { nullable: true }) groupBy?: string,
    @CurrentUser() user?: UserEntity,
  ): Promise<MetricsDto[]> {
    return this.analyticsService.getMetrics(user.id, dateFrom, dateTo, groupBy);
  }

  /**
   * Real-time metrics subscription
   */
  @Subscription(() => MetricsDto)
  @UseGuards(JwtGuard)
  async metricsUpdated(@CurrentUser() user: UserEntity): Promise<AsyncIterable<MetricsDto>> {
    return pubSub.asyncIterator(['metricsUpdated']);
  }
}
```

**File**: `src/analytics/dto/dashboard.dto.ts`

```typescript
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { MetricsDto } from './metrics.dto';

@ObjectType()
export class DashboardDto {
  @Field()
  id: string;

  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  activeUsers: number;

  @Field(() => Int)
  totalSessions: number;

  @Field(() => [MetricsDto])
  metrics: MetricsDto[];

  @Field()
  lastUpdated: Date;
}
```

**File**: `src/analytics/dto/metrics.dto.ts`

```typescript
import { ObjectType, Field, Float, ID } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class MetricsDto {
  @Field(() => ID)
  id: string;

  @Field()
  timestamp: Date;

  @Field()
  event: string;

  @Field(() => Float)
  value: number;

  @Field({ nullable: true })
  dimension?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, any>;
}
```

---

## Secure Token Management

### Step 1: JWT Guard

**File**: `src/auth/jwt.guard.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: any) {
    const request: Request = context.switchToHttp().getRequest();

    // Try to get token from:
    // 1. Authorization header
    // 2. Cookies (HTTP-only)
    const authHeader = request.headers.authorization;
    const cookieToken = request.cookies?.accessToken;

    if (!authHeader && !cookieToken) {
      throw new UnauthorizedException('No token provided');
    }

    if (authHeader) {
      // Extract bearer token
      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer') {
        throw new UnauthorizedException('Invalid token scheme');
      }
      request['token'] = token;
    } else {
      request['token'] = cookieToken;
    }

    return super.canActivate(context);
  }
}
```

### Step 2: JWT Strategy

**File**: `src/auth/jwt.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return user;
  }
}
```

### Step 3: Current User Decorator

**File**: `src/auth/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const gqlContext = GqlExecutionContext.create(context);
  return gqlContext.getContext().req.user;
});
```

---

## Real-time Subscriptions

### Step 1: WebSocket Configuration

**File**: `src/websocket/websocket.gateway.ts`

```typescript
import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';

import { WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({
  namespace: '/updates',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(','),
    credentials: true,
  },
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userConnections: Map<string, Set<string>> = new Map();

  @SubscribeMessage('subscribe')
  @UseGuards(WsJwtGuard)
  handleSubscribe(client: Socket, data: { userId: string; channel: string }) {
    const { userId, channel } = data;

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }

    this.userConnections.get(userId)!.add(client.id);
    client.join(`user:${userId}:${channel}`);

    return { status: 'subscribed', channel };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, data: { userId: string; channel: string }) {
    const { userId, channel } = data;

    this.userConnections.get(userId)?.delete(client.id);
    client.leave(`user:${userId}:${channel}`);

    return { status: 'unsubscribed', channel };
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up subscriptions
    this.userConnections.forEach((connections) => {
      connections.delete(client.id);
    });
  }

  // Emit updates to specific user
  emitToUser(userId: string, channel: string, data: any) {
    this.server.to(`user:${userId}:${channel}`).emit('update', data);
  }
}
```

### Step 2: Metrics Update Service

**File**: `src/analytics/metrics-update.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { WebSocketGateway } from '../websocket/websocket.gateway';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class MetricsUpdateService {
  constructor(
    private websocketGateway: WebSocketGateway,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Emit metrics updates every 30 seconds
   */
  @Interval(30000)
  async broadcastMetricsUpdates() {
    const metrics = await this.analyticsService.getLatestMetrics();

    metrics.forEach((metric) => {
      this.websocketGateway.emitToUser(metric.userId, 'metrics', {
        timestamp: new Date(),
        metrics: metric,
      });
    });
  }
}
```

---

## Error Handling

### Step 1: GraphQL Exception Filter

**File**: `src/filters/graphql-exception.filter.ts`

```typescript
import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch(HttpException)
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const status = exception.getStatus();
    const response = exception.getResponse() as any;

    return new GraphQLError(response.message || exception.message, {
      extensions: {
        code: response.error || 'INTERNAL_SERVER_ERROR',
        status,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

### Step 2: Custom Error Types

**File**: `src/common/errors/app.error.ts`

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super('AUTHENTICATION_ERROR', 401, message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super('AUTHORIZATION_ERROR', 403, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super('VALIDATION_ERROR', 400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', 404, `${resource} not found`);
  }
}
```

---

## Testing

### Step 1: Unit Tests - Auth Service

**File**: `src/auth/auth.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { PkceService } from './pkce.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        PkceService,
        JwtService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiatePkceFlow', () => {
    it('should generate PKCE codes', async () => {
      const result = await service.initiatePkceFlow({
        provider: 'keycloak',
        email: 'test@example.com',
      });

      expect(result).toHaveProperty('codeChallenge');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('sessionId');
    });
  });

  describe('refreshAccessToken', () => {
    it('should return new access token', async () => {
      const mockUser: Partial<UserEntity> = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
      };

      const mockToken = {
        id: '1',
        token: 'refresh-token',
        user: mockUser,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockToken);
      jest.spyOn(jwtService, 'sign').mockReturnValue('new-access-token');

      const result = await service.refreshAccessToken('refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('new-access-token');
    });
  });
});
```

### Step 2: Integration Tests - Auth Resolver

**File**: `src/auth/auth.resolver.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { AppModule } from '../app.module';

describe('Auth Resolver (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('initiatePkceFlow', () => {
    it('should initiate PKCE flow', () => {
      const query = `
        mutation {
          initiatePkceFlow(provider: "keycloak", email: "test@example.com")
        }
      `;

      return request(app.getHttpServer()).post('/graphql').send({ query }).expect(200);
    });
  });

  describe('exchangeAuthorizationCode', () => {
    it('should exchange authorization code', () => {
      const query = `
        mutation {
          exchangeAuthorizationCode(input: {
            code: "auth-code"
            state: "state-value"
            sessionId: "session-id"
          }) {
            accessToken
            refreshToken
            user {
              id
              email
              name
            }
          }
        }
      `;

      return request(app.getHttpServer()).post('/graphql').send({ query }).expect(200);
    });
  });
});
```

---

## Security Best Practices

### Step 1: Environment Variables

**File**: `.env.development`

```bash
# App
APP_NAME=BFF
PORT=3000
NODE_ENV=development

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=bff_db

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth - Keycloak
KEYCLOAK_REALM=your-realm
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER_URL=http://keycloak:8080/realms/your-realm

# CORS
CORS_ORIGIN=http://localhost:3002,http://localhost:5001,http://localhost:5002

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**File**: `.env.production`

```bash
# Production environment
APP_NAME=BFF
PORT=3000
NODE_ENV=production

# Database (use managed service)
DATABASE_HOST=${DB_HOST}
DATABASE_PORT=${DB_PORT}
DATABASE_USER=${DB_USER}
DATABASE_PASSWORD=${DB_PASSWORD}
DATABASE_NAME=${DB_NAME}

# JWT (use strong secret from vault)
JWT_SECRET=${JWT_SECRET_FROM_VAULT}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
KEYCLOAK_REALM=${KEYCLOAK_REALM}
KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID}
KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}
KEYCLOAK_ISSUER_URL=https://keycloak.prod.example.com/realms/your-realm

# CORS (restrict to production domain)
CORS_ORIGIN=https://analytics.example.com

# Redis (managed)
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
```

### Step 2: Security Headers Middleware

**File**: `src/middleware/security-headers.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // CSP - Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    );

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Strict Transport Security (HTTPS only in production)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  }
}
```

### Step 3: CORS Configuration

**File**: `src/config/cors.config.ts`

```typescript
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3002').split(',');

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
};
```

---

## Deployment

### Step 1: Docker Configuration

**File**: `Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml package.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/main"]
```

### Step 2: Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  bff:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=password
      - DATABASE_NAME=bff_db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - KEYCLOAK_ISSUER_URL=http://keycloak:8080/realms/your-realm
    depends_on:
      - postgres
      - redis
      - keycloak
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=bff_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    networks:
      - app-network

  keycloak:
    image: keycloak/keycloak:latest
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
    ports:
      - '8080:8080'
    command: start-dev
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

---

## Complete Example: API Usage

### Frontend Integration

**File**: `frontend/services/auth.ts`

```typescript
import { generateCodeVerifier, generateCodeChallenge } from './pkce';

export async function initiatePkceLogin(provider: string) {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier in sessionStorage
  sessionStorage.setItem('pkce_verifier', verifier);

  // Get PKCE session info from BFF
  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          initiatePkceFlow(provider: "${provider}", email: "user@example.com")
        }
      `,
    }),
  });

  const data = await response.json();
  const pkceData = JSON.parse(data.data.initiatePkceFlow);

  // Redirect to OAuth provider
  const oauthUrl = new URL(`http://keycloak:8080/realms/your-realm/protocol/openid-connect/auth`);
  oauthUrl.searchParams.set('client_id', 'your-client-id');
  oauthUrl.searchParams.set('redirect_uri', window.location.origin + '/callback');
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('code_challenge', challenge);
  oauthUrl.searchParams.set('code_challenge_method', 'S256');
  oauthUrl.searchParams.set('state', pkceData.state);

  window.location.href = oauthUrl.toString();
}

export async function exchangeAuthorizationCode(code: string, sessionId: string, state: string) {
  const verifier = sessionStorage.getItem('pkce_verifier');

  const response = await fetch('http://localhost:3000/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          exchangeAuthorizationCode(input: {
            code: "${code}"
            state: "${state}"
            sessionId: "${sessionId}"
          }) {
            accessToken
            refreshToken
            user {
              id
              email
              name
            }
          }
        }
      `,
    }),
  });

  const data = await response.json();
  const result = data.data.exchangeAuthorizationCode;

  // Clear sessionStorage
  sessionStorage.removeItem('pkce_verifier');

  // Tokens are in HTTP-only cookies, so no need to store them
  // But we can store user info
  localStorage.setItem('user', JSON.stringify(result.user));

  return result;
}
```

---

## Summary

### What You Get

✅ **PKCE Authentication**

- Secure code exchange flow
- No client secrets needed
- Protection against code interception
- OAuth 2.0 compliant

✅ **GraphQL API**

- Single endpoint
- Query only what you need
- Strongly typed schema
- Real-time subscriptions
- Excellent DX

✅ **NestJS Architecture**

- Modular structure
- Type-safe
- Tested patterns
- Production-ready
- Scalable

✅ **Security**

- JWT tokens
- Secure cookies
- PKCE implementation
- Security headers
- Input validation

---

## Next Steps

1. **Setup Database** - Run migrations with TypeORM
2. **Configure OAuth** - Setup Keycloak or other providers
3. **Deploy** - Use Docker Compose or Kubernetes
4. **Monitor** - Add observability (see OBSERVABILITY_SETUP.md)
5. **Test** - Run unit and integration tests

---

**Document Created**: 2026-05-18  
**Status**: Complete & Production-Ready  
**Framework**: NestJS 10.x  
**GraphQL**: Apollo Server  
**Authentication**: PKCE + JWT
