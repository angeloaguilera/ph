import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CashFlowStatementService } from './cash-flow-statement.service';
import { CashFlowResultGQL, GenerateCashFlowInput } from './graphql/cash-flow.graphql';
import { GenerateCashFlowDto } from './dto/generate-cash-flow.dto';

@Resolver(() => CashFlowResultGQL)
export class CashFlowStatementResolver {
  constructor(private readonly svc: CashFlowStatementService) {}

  @Mutation(() => CashFlowResultGQL)
  async generateCashFlow(@Args('input') input: GenerateCashFlowInput) {
    const dto: GenerateCashFlowDto = {
      startDate: input.startDate,
      endDate: input.endDate,
      currency: input.currency,
      method: (input.method as any) ?? 'direct',
      cashAccountIds: input.cashAccountIds,
      saveReport: input.saveReport ?? false,
    };
    const { result } = await this.svc.generate(dto);
    return result;
  }

  @Query(() => CashFlowResultGQL)
  async getSavedCashFlowReport(@Args('reportId') reportId: string) {
    const r = await this.svc.getReport(reportId);
    if (!r) return null;
    return r.result;
  }
}
