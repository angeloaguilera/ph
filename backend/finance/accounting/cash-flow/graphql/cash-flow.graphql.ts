import { Field, ObjectType, InputType, Float, ID } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class CashFlowTransactionLineGQL {
  @Field(() => ID) _id: string;
  @Field() type: string;
  @Field(() => Float) amount: number;
  @Field() currency: string;
  @Field() date: string;
  @Field({ nullable: true }) paymentMethod?: string;
  @Field({ nullable: true }) reference?: string;
  @Field({ nullable: true }) description?: string;
  @Field({ nullable: true }) status?: string;
  @Field({ nullable: true }) cashAccount?: string;
  @Field({ nullable: true }) counterpartAccount?: string;
  @Field({ nullable: true }) toAccount?: string;
  @Field({ nullable: true }) journalEntryRef?: string;
}

@InputType()
export class CashFlowTransactionInput {
  @Field() type: string;

  // explicitly mark numeric GraphQL type for input as Float
  @Field(() => Float) amount: number;

  @Field(() => String) date: string;

  @Field() cashAccount: string;

  @Field({ nullable: true }) counterpartAccount?: string;
  @Field({ nullable: true }) toAccount?: string;
  @Field({ nullable: true }) currency?: string;
  @Field({ nullable: true }) exchangeRate?: number;
  @Field({ nullable: true }) paymentMethod?: string;
  @Field({ nullable: true }) reference?: string;
  @Field({ nullable: true }) description?: string;

  // EXPLICIT: use GraphQLJSONObject for arbitrary object (nullable)
  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, any>;
}
