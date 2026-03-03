import { IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';

export class GenerateCashProjectionDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  frequency?: 'daily' | 'weekly' | 'monthly';
}
