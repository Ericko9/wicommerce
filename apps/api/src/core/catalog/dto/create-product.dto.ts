import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
import { ProductStatus } from '@ucp/database';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  basePrice!: number;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsInt()
  @Min(0)
  @IsOptional()
  initialQuantity?: number;
}
