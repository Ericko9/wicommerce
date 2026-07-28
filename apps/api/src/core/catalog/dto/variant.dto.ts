import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @IsInt()
  @Min(0)
  @IsOptional()
  initialQuantity?: number;
}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
