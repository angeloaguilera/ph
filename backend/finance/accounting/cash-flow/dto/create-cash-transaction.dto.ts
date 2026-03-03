import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
  IsMongoId,
  IsString,
} from 'class-validator';
import { CashFlowType } from '../schemas/cash-flow-transaction.schema';

export class CreateCashFlowTransactionDto {
  @IsEnum(CashFlowType)
  type: CashFlowType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsDateString()
  date: string;

  @IsMongoId()
  cashAccount: string;

  @IsOptional()
  @IsMongoId()
  counterpartAccount?: string;

  @IsOptional()
  @IsMongoId()
  toAccount?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: Record<string, string>;

  @IsOptional()
  attachments?: string[];

  @IsOptional()
  @IsMongoId()
  createdBy?: string;
}
