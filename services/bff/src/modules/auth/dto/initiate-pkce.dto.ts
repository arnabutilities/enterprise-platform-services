import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { AuthProvider } from '@enterprise-platform/contracts';

export class InitiatePkceDto {
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  @IsEnum(['local', 'keycloak'])
  provider!: AuthProvider;

  @IsOptional()
  @IsString()
  @MinLength(43)
  @MaxLength(128)
  codeVerifier?: string;
}
