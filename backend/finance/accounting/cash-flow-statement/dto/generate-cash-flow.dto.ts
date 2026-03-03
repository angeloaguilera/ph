import { IsDateString, IsEnum, IsOptional, IsString, IsArray, ArrayNotEmpty, IsBoolean } from 'class-validator';

export class GenerateCashFlowDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  currency?: string; // output currency (default USD)

  @IsOptional()
  @IsEnum(['direct', 'indirect'])
  method?: 'direct' | 'indirect';

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  cashAccountIds?: string[]; // optional explicit cash account ids - recommended

  @IsOptional()
  @IsBoolean()
  saveReport?: boolean;
}
