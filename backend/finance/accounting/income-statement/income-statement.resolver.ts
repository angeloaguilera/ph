import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { IncomeStatementService } from './income-statement.service';
import { IncomeStatementResultGQL, GenerateIncomeStatementInput } from './graphql/income-statement.graphql';
import { GenerateIncomeStatementDto } from './dto/generate-income-statement.dto';

@Resolver(() => IncomeStatementResultGQL)
export class IncomeStatementResolver {
  constructor(private readonly svc: IncomeStatementService) {}

  @Mutation(() => IncomeStatementResultGQL)
  async generateIncomeStatement(@Args('input') input: GenerateIncomeStatementInput) {
    const dto: GenerateIncomeStatementDto = {
      startDate: input.startDate,
      endDate: input.endDate,
      currency: input.currency,
      groupBy: (input.groupBy as any) ?? 'byAccount',
      saveReport: input.saveReport ?? false,
    };
    const { result } = await this.svc.generate(dto);
    return result;
  }

  @Query(() => IncomeStatementResultGQL)
  async getSavedReport(@Args('reportId') reportId: string) {
    const r = await this.svc.getReport(reportId);
    if (!r) return null;
    return r.result;
  }
}
