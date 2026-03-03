import { IsDateString, IsNotEmpty, IsNumber, IsArray } from 'class-validator';

export class CreateReconciliationDto {
  @IsNotEmpty()
  bankAccountId: string;

  @IsDateString()
  statementPeriodStart: string;

  @IsDateString()
  statementPeriodEnd: string;

  @IsNumber()
  openingBalance: number;

  @IsNumber()
  closingBalance: number;

  @IsArray()
  bankTransactions: any[];
}
