import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { AccountObjectType, CreateAccountInput } from './graphql/account.graphql';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Resolver(() => AccountObjectType)
export class ChartOfAccountsResolver {
  constructor(private readonly svc: ChartOfAccountsService) {}

  @Query(() => [AccountObjectType], { name: 'accounts' })
  findAll() {
    return this.svc.findAll();
  }

  @Query(() => [AccountObjectType], { name: 'accountTree' })
  accountTree() {
    return this.svc.getTree();
  }

  @Query(() => AccountObjectType, { name: 'account' })
  findOne(@Args('idOrCode') idOrCode: string) {
    return this.svc.findOne(idOrCode);
  }

  @Mutation(() => AccountObjectType)
  createAccount(@Args('input') input: CreateAccountInput) {
    const dto: CreateAccountDto = { ...input } as any;
    return this.svc.create(dto);
  }

  @Mutation(() => AccountObjectType)
  updateAccount(@Args('id') id: string, @Args('input') input: CreateAccountInput) {
    const dto: UpdateAccountDto = { ...input } as any;
    return this.svc.update(id, dto);
  }

  @Mutation(() => Boolean)
  deleteAccount(@Args('id') id: string) {
    return this.svc.remove(id).then(() => true);
  }

  @Mutation(() => AccountObjectType)
  adjustAccountBalance(@Args('id') id: string, @Args('amount') amount: number) {
    return this.svc.adjustBalance(id, amount);
  }
}
