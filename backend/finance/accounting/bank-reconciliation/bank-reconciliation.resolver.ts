import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankStatementGQL, AutoMatchInput } from './graphql/bank-reconciliation.graphql';

@Resolver(() => BankStatementGQL)
export class BankReconciliationResolver {
  constructor(private readonly svc: BankReconciliationService) {}

  @Query(() => BankStatementGQL)
  getStatement(@Args('id') id: string) {
    return this.svc.getStatement(id);
  }

  @Mutation(() => String)
  async importStatementGraphQL(@Args('content') content: string, @Args('inputJson') inputJson: string) {
    // inputJson: serialized ImportBankStatementDto
    const dto = JSON.parse(inputJson);
    const saved = await this.svc.importStatement(content, dto);
    return String(saved._id);
  }

  @Mutation(() => String)
  async autoMatchGraphQL(@Args('input') input: AutoMatchInput) {
    const res = await this.svc.autoMatch(input.statementId, { toleranceDays: input.toleranceDays, toleranceAmount: input.toleranceAmount });
    return `Matches: ${res.matchesFound}`;
  }
}
