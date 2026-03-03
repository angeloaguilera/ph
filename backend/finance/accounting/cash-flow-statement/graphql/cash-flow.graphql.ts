import { Field, ObjectType, InputType, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class CashFlowResultLineGQL {
  @Field()
  operating: number;

  @Field()
  investing: number;

  @Field()
  financing: number;

  @Field()
  totalCashChange: number;
}

@ObjectType()
export class CashFlowResultGQL {
  @Field()
  startDate: string;

  @Field()
  endDate: string;

  @Field()
  currency: string;

  @Field()
  method: string;

  @Field(() => Float)
  operating: number;

  @Field(() => Float)
  investing: number;

  @Field(() => Float)
  financing: number;

  @Field(() => Float)
  totalCashChange: number;

  @Field({ nullable: true })
  indirect?: any;

  @Field()
  generatedAt: string;

  @Field()
  numEntriesConsidered: number;

  @Field(() => [String])
  detectedCashAccounts: string[];
}

@InputType()
export class GenerateCashFlowInput {
  @Field()
  startDate: string;

  @Field()
  endDate: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  method?: string;

  @Field(() => [String], { nullable: true })
  cashAccountIds?: string[];

  @Field({ nullable: true })
  saveReport?: boolean;
}
