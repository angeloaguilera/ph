import { Field, ObjectType, InputType, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class BankStatementLineGQL {
  @Field(() => ID)
  _id: string;

  @Field()
  date: string;

  @Field(() => Float)
  amount: number;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  transactionId?: string;

  @Field({ nullable: true })
  matched?: boolean;

  @Field({ nullable: true })
  matchedJournalEntry?: string;
}

@ObjectType()
export class BankStatementGQL {
  @Field(() => ID)
  _id: string;

  @Field()
  accountName: string;

  @Field()
  bankAccountId: string;

  @Field()
  currency: string;

  @Field()
  statementDate: string;

  @Field(() => [BankStatementLineGQL])
  lines: BankStatementLineGQL[];
}

@InputType()
export class AutoMatchInput {
  @Field()
  statementId: string;

  @Field({ nullable: true })
  toleranceDays?: number;

  @Field({ nullable: true })
  toleranceAmount?: number;
}
