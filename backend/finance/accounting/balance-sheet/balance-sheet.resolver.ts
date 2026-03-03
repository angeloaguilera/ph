import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BalanceSheetService } from './balance-sheet.service';
import { BalanceSheetResultGQL, GenerateBalanceSheetInput } from './graphql/balance-sheet.graphql';
import { GenerateBalanceSheetDto } from './dto/generate-balance-sheet.dto';

@Resolver(() => BalanceSheetResultGQL)
export class BalanceSheetResolver {
  constructor(private readonly svc: BalanceSheetService) {}

  @Mutation(() => BalanceSheetResultGQL)
  async generateBalanceSheet(@Args('input') input: GenerateBalanceSheetInput) {
    const dto: GenerateBalanceSheetDto = {
      snapshotDate: input.snapshotDate,
      currency: input.currency,
      groupBy: (input.groupBy as any) ?? 'byAccount',
      saveReport: input.saveReport ?? false,
    };
    const { result } = await this.svc.generate(dto);
    return result;
  }

  @Query(() => BalanceSheetResultGQL)
  async getSavedBalanceSheet(@Args('reportId') reportId: string) {
    const r = await this.svc.getReport(reportId);
    if (!r) return null;
    return r.result;
  }
}
