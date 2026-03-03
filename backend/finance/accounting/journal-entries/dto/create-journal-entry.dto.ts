// src/finance/accounting/dto/create-journal-entry.dto.ts
import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  Min,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import GraphQLJSON from 'graphql-type-json';
import { JournalLineDto } from './journal-line.dto';

@InputType('JournalEntryInput') // forzar el mismo nombre que aparece en el error
export class CreateJournalEntryDto {
  @Field(() => String)
  @IsString()
  description: string;

  @Field(() => String)
  @IsDateString()
  date: string;

  @Field(() => [JournalLineDto])
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  @ArrayMinSize(1)
  lines: JournalLineDto[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  reference?: string;

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

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  source?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  fiscalPeriod?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fiscalYear?: number;

  // metadata: uso GraphQLJSON y además lo mapeamos en scalarsMap (ver AppModule)
  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  attachments?: string[];
}
