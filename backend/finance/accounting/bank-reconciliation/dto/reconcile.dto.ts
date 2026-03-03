import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ManualMatchDto {
  @IsString()
  @IsNotEmpty()
  statementId: string;

  @IsString()
  @IsNotEmpty()
  statementLineId: string;

  @IsString()
  @IsNotEmpty()
  journalEntryId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class FinalizeReconciliationDto {
  @IsString()
  @IsNotEmpty()
  reconciliationId: string;

  @IsOptional()
  @IsString()
  finalizedBy?: string;

  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number; // when ledger vs bank differs
}
