import { Field, ID, ObjectType, InputType, Float } from '@nestjs/graphql';

@ObjectType()
export class AccountObjectType {
  @Field(() => ID)
  _id: string;

  @Field()
  code: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  parent?: string;

  @Field({ nullable: true })
  level?: number;

  @Field()
  normalBalance?: string;

  @Field(() => String)
  balance?: string; // string to preserve Decimal128 exactness

  @Field()
  allowPosting?: boolean;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  isSystemAccount?: boolean;

  @Field({ nullable: true })
  createdAt?: Date;

  @Field({ nullable: true })
  updatedAt?: Date;
}

@InputType()
export class CreateAccountInput {
  @Field()
  code: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  parent?: string;

  @Field({ nullable: true })
  normalBalance?: string;

  @Field({ nullable: true })
  balance?: number;

  @Field({ nullable: true })
  allowPosting?: boolean;

  @Field({ nullable: true })
  currency?: string;
}
