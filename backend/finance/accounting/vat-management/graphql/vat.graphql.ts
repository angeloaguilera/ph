import { Field, ObjectType, InputType, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class VatLineGQL {
  @Field()
  account: string;

  @Field(() => Float)
  baseAmount: number;

  @Field(() => Float)
  vatAmount: number;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  vatRuleCode?: string;
}

@ObjectType()
export class VatTransactionGQL {
  @Field(() => ID)
  _id: string;

  @Field()
  type: string;

  @Field()
  date: string;

  @Field()
  reference: string;

  @Field(() => [VatLineGQL])
  lines: VatLineGQL[];

  @Field(() => Float)
  totalBase: number;

  @Field(() => Float)
  totalVat: number;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  journalEntryRef?: string;
}

@InputType()
export class VatLineInput {
  @Field()
  account: string;

  @Field()
  baseAmount: number;

  @Field({ nullable: true })
  vatRuleCode?: string;

  @Field({ nullable: true })
  description?: string;
}

@InputType()
export class VatTransactionInput {
  @Field()
  type: string;

  @Field()
  date: string;

  @Field()
  reference: string;

  @Field(() => [VatLineInput])
  lines: VatLineInput[];

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  exchangeRate?: number;
}
