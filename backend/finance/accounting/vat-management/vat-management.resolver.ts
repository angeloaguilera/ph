import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { VatManagementService } from './vat-management.service';
import { VatTransactionGQL, VatTransactionInput } from './graphql/vat.graphql';
import { GenerateVatReportDto } from './dto/generate-vat-report.dto';

@Resolver(() => VatTransactionGQL)
export class VatManagementResolver {
  constructor(private readonly svc: VatManagementService) {}

  @Query(() => [VatTransactionGQL], { name: 'vatTransactions' })
  async listVatTransactions(@Args('limit', { type: () => Number, nullable: true }) limit = 50,
                            @Args('skip', { type: () => Number, nullable: true }) skip = 0) {
    // simple find in vatModel - service method could be added
    return (this.svc as any).vatModel.find().sort({ date: -1 }).skip(skip).limit(limit).lean();
  }

  @Mutation(() => VatTransactionGQL)
  async createVatTransaction(@Args('input') input: VatTransactionInput) {
    // transform to create dto
    const dto: any = {
      type: input.type,
      date: input.date,
      reference: input.reference,
      lines: input.lines.map(l => ({ account: l.account, baseAmount: l.baseAmount, vatRuleCode: l.vatRuleCode, description: l.description })),
    };
    return this.svc.registerVatTransaction(dto, true);
  }

  @Mutation(() => String)
  async generateVatReport(@Args('startDate') startDate: string, @Args('endDate') endDate: string) {
    const dto: GenerateVatReportDto = { startDate, endDate } as any;
    const { reportId } = await this.svc.generateVatReport(dto);
    return String(reportId);
  }
}
