import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateVatLineDto {
  @IsNotEmpty()
  @IsString()
  account: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseAmount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  vatRuleCode?: string; // if not provided, service will use default rule
}

export class CreateVatTransactionDto {
  @IsEnum(['sale', 'purchase'])
  type: 'sale' | 'purchase';

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVatLineDto)
  @ArrayMinSize(1)
  lines: CreateVatLineDto[];

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  metadata?: Record<string, string>;
}
