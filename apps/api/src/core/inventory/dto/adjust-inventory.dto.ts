import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum InventoryAdjustmentType {
  IN = 'IN',
  OUT = 'OUT',
  SET = 'SET',
}

export class AdjustInventoryDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsEnum(InventoryAdjustmentType)
  type!: InventoryAdjustmentType;

  @IsInt()
  quantity!: number;

  @IsString()
  @IsOptional()
  note?: string;
}
