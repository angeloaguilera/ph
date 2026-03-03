import { Field, ObjectType, InputType, Float } from '@nestjs/graphql';

@ObjectType()
export class BalanceAccountGQL {
  @Field()
  accountId: string;

  @Field()
  code: string;

  @Field()
  name: string;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class BalanceSheetResultGQL {
  @Field()
  snapshotDate: string;

  @Field()
  currency: string;

  @Field(() => [BalanceAccountGQL])
  assets: BalanceAccountGQL[];

  @Field(() => Float)
  totalAssets: number;

  @Field(() => [BalanceAccountGQL])
  liabilities: BalanceAccountGQL[];

  @Field(() => Float)
  totalLiabilities: number;

  @Field(() => [BalanceAccountGQL])
  equity: BalanceAccountGQL[];

  @Field(() => Float)
  totalEquity: number;

  @Field(() => Float)
  liabilitiesPlusEquity: number;

  @Field(() => Float)
  difference: number;
}

@InputType()
export class GenerateBalanceSheetInput {
  @Field()
  snapshotDate: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  groupBy?: string;

  @Field({ nullable: true })
  saveReport?: boolean;
}
