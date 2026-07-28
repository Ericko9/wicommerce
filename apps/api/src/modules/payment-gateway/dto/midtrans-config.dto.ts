import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MidtransConfigDto {
  @IsString()
  @IsNotEmpty()
  merchantId!: string;

  @IsString()
  @IsNotEmpty()
  serverKey!: string;

  @IsString()
  @IsNotEmpty()
  clientKey!: string;

  @IsBoolean()
  @IsOptional()
  isProduction?: boolean = false;
}
