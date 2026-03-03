import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CashFlowService } from './cash-flow.service';
import { CashFlowTransactionLineGQL, CashFlowTransactionInput } from './graphql/cash-flow.graphql';
import { GenerateCashProjectionDto } from './dto/generate-projection.dto';

@Resolver(() => CashFlowTransactionLineGQL)
export class CashFlowResolver {
  constructor(private readonly svc: CashFlowService) {}

  @Query(() => [CashFlowTransactionLineGQL], { name: 'cashTransactions' })
  findAll(@Args('limit', { type: () => Number, nullable: true }) limit = 50,
          @Args('skip', { type: () => Number, nullable: true }) skip = 0) {
    return this.svc.findAll({}, limit, skip);
  }

  @Query(() => CashFlowTransactionLineGQL, { name: 'cashTransaction' })
  findOne(@Args('id') id: string) {
    return this.svc.findOne(id);
  }

  @Mutation(() => CashFlowTransactionLineGQL)
  createCashTransaction(@Args('input') input: CashFlowTransactionInput) {
    // transform to DTO shape
    const dto: any = {
      ...input,
      date: input.date,
      createdBy: undefined,
    };
    return this.svc.create(dto);
  }

  @Mutation(() => CashFlowTransactionLineGQL)
  completeCashTransaction(@Args('id') id: string, @Args('completedBy', { nullable: true }) completedBy?: string) {
    return this.svc.complete(id, completedBy, true);
  }

  @Mutation(() => Boolean)
  reconcileCashTransaction(@Args('id') id: string) {
    return this.svc.reconcile(id).then(() => true);
  }

  @Mutation(() => Boolean)
  cancelCashTransaction(@Args('id') id: string) {
    return this.svc.cancel(id).then(() => true);
  }

  @Mutation(() => String)
  async generateProjection(@Args('startDate') startDate: string, @Args('endDate') endDate: string, @Args('frequency', { nullable: true }) frequency?: string) {
    const dto: GenerateCashProjectionDto = { startDate, endDate, frequency: (frequency as any) ?? 'daily' } as any;
    const { savedProjectionId } = await this.svc.generateProjection(dto);
    return String(savedProjectionId);
  }
}
