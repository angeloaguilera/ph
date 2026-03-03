import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GenerateVatReportDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  groupBy?: 'byAccount' | 'byRule' | 'summary';
}
