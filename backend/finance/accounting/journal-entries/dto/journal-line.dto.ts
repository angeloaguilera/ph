import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsMongoId, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

@InputType('JournalLineInput') // le doy nombre explícito (opcional)
export class JournalLineDto {
  @Field(() => ID)
  @IsMongoId()
  account: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  debit: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  credit: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  taxAmount?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  exchangeRate?: number;
}
