import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class XenditConfigDto {
  @IsString()
  @IsNotEmpty()
  secretKey!: string;

  @IsString()
  @IsNotEmpty()
  webhookVerificationToken!: string;

  @IsBoolean()
  @IsOptional()
  isProduction?: boolean = false;
}
