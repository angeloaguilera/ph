import { Field, ObjectType, InputType, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class IncomeLineGQL {
  @Field({ nullable: true })
  accountId?: string;

  @Field()
  code: string;

  @Field()
  name: string;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class IncomeStatementResultGQL {
  @Field()
  startDate: string;

  @Field()
  endDate: string;

  @Field()
  currency: string;

  @Field()
  groupBy: string;

  @Field(() => [IncomeLineGQL])
  revenues: IncomeLineGQL[];

  @Field(() => Float)
  totalRevenue: number;

  @Field(() => [IncomeLineGQL])
  expenses: IncomeLineGQL[];

  @Field(() => Float)
  totalExpenses: number;

  @Field(() => Float)
  netIncome: number;

  @Field()
  generatedAt: string;

  @Field()
  numEntriesConsidered: number;
}

@InputType()
export class GenerateIncomeStatementInput {
  @Field()
  startDate: string;

  @Field()
  endDate: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  groupBy?: string;

  @Field({ nullable: true })
  saveReport?: boolean;
}
