import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ExchangePkceDto {
  @IsUUID()
  sessionId!: string;

  @IsString()
  @MinLength(1)
  state!: string;

  @IsString()
  @MinLength(43)
  @MaxLength(128)
  codeVerifier!: string;

  @IsOptional()
  @IsString()
  code?: string;
}
