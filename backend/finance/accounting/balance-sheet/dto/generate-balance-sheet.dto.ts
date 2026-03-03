import { IsDateString, IsOptional, IsString, IsBoolean } from 'class-validator';

export class GenerateBalanceSheetDto {
  @IsDateString()
  snapshotDate: string; // ISO date - snapshot at end of day

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  groupBy?: 'byAccount' | 'byCategory';

  @IsOptional()
  @IsBoolean()
  saveReport?: boolean;
}
