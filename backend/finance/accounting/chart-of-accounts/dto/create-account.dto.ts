import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsMongoId,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { AccountType } from '../schemas/account.schema';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsMongoId()
  parent?: string;

  @IsOptional()
  @IsEnum(['debit', 'credit'] as any)
  normalBalance?: 'debit' | 'credit';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  balance?: number; // in major units (e.g., dollars) - will be stored as Decimal128

  @IsOptional()
  @IsBoolean()
  allowPosting?: boolean;

  @IsOptional()
  @IsString()
  currency?: string;
}
