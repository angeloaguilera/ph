import { IsDateString, IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

export class GenerateIncomeStatementDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  currency?: string; // desired output currency (default USD) - conversion uses line.exchangeRate

  @IsOptional()
  @IsEnum(['byAccount', 'byCategory'], { each: false })
  groupBy?: 'byAccount' | 'byCategory';

  @IsOptional()
  @IsBoolean()
  saveReport?: boolean;
}
