import { IsNotEmpty, IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateVatRuleDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  rate: number;

  @IsOptional()
  @IsString()
  appliesTo?: 'sale' | 'purchase' | 'both';

  @IsOptional()
  @IsBoolean()
  isRetention?: boolean;

  @IsOptional()
  @IsBoolean()
  isPerception?: boolean;

  @IsOptional()
  @IsString()
  country?: string;
}
