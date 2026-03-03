import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class JournalLineObjectType {
  @Field(() => String) account: string;
  @Field({ nullable: true }) description?: string;
  @Field() debit: number;
  @Field() credit: number;
  @Field({ nullable: true }) taxCode?: string;
  @Field({ nullable: true }) taxAmount?: number;
  @Field({ nullable: true }) currency?: string;
  @Field({ nullable: true }) exchangeRate?: number;
}

@ObjectType()
export class JournalEntryObjectType {
  @Field(() => ID) _id: string;
  @Field() description: string;
  @Field(() => [JournalLineObjectType]) lines: JournalLineObjectType[];
  // Prefer explicit type for Date fields too (optional but recommended)
  @Field(() => Date) date: Date;
  @Field({ nullable: true }) reference?: string;
  @Field() status: string;
  @Field() currency: string;
  @Field({ nullable: true }) exchangeRate?: number;
  @Field() totalDebit: number;
  @Field() totalCredit: number;
  @Field({ nullable: true }) postedAt?: Date;
  @Field({ nullable: true }) createdAt?: Date;
  @Field({ nullable: true }) updatedAt?: Date;
  @Field({ nullable: true }) reversalOf?: string;
  @Field({ nullable: true }) isReversal?: boolean;
  @Field({ nullable: true }) fiscalPeriod?: string;
  @Field({ nullable: true }) fiscalYear?: number;
}

@InputType()
export class JournalLineInput {
  @Field() account: string;
  @Field({ nullable: true }) description?: string;
  @Field() debit: number;
  @Field() credit: number;
  @Field({ nullable: true }) taxCode?: string;
  @Field({ nullable: true }) taxAmount?: number;
  @Field({ nullable: true }) currency?: string;
  @Field({ nullable: true }) exchangeRate?: number;
}

@InputType()
export class JournalEntryInput {
  @Field() description: string;
  @Field(() => Date) date: Date;
  @Field(() => [JournalLineInput]) lines: JournalLineInput[];
  @Field({ nullable: true }) reference?: string;
  @Field({ nullable: true }) currency?: string;
  @Field({ nullable: true }) exchangeRate?: number;

  // Explicit: use GraphQLJSONObject for arbitrary key/value object
  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, any>;

  @Field(() => [String], { nullable: true }) attachments?: string[];
  @Field({ nullable: true }) fiscalPeriod?: string;
  @Field({ nullable: true }) fiscalYear?: number;
}
