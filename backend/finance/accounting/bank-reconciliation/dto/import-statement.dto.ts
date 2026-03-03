import { IsNotEmpty, IsString, IsIn, IsOptional, IsMongoId, IsArray } from 'class-validator';

export class ImportBankStatementDto {
  @IsString()
  @IsNotEmpty()
  bankAccountId: string; // id of our ledger account representing the bank

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsIn(['csv', 'ofx'])
  format: 'csv' | 'ofx';

  @IsString()
  sourceFileName: string;

  @IsOptional()
  @IsString()
  metadata?: string; // json string if needed

  // For CSV: user can pass mapping if needed (optional)
  @IsOptional()
  @IsString()
  csvMapping?: string; // json string: {dateColumn, amountColumn, descriptionColumn, transactionIdColumn}
}
