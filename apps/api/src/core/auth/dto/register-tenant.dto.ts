import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty()
  storeName!: string;

  @IsString()
  @IsNotEmpty()
  subdomain!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;

  @IsEmail()
  @IsNotEmpty()
  ownerEmail!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  planKey?: string; // "basic" | "pro" | "enterprise"
}
