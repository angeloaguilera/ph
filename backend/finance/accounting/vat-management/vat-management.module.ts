import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VatManagementService } from './vat-management.service';
import { VatManagementController } from './vat-management.controller';
import { VatManagementResolver } from './vat-management.resolver';
import { VatRule, VatRuleSchema } from './shemas/vat-rule.schema';
import { VatTransaction, VatTransactionSchema } from './shemas/vat-transaction.schema';
import { VatReport, VatReportSchema } from './shemas/vat-report.schema';
import { JournalEntry, JournalEntrySchema } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountSchema } from '../chart-of-accounts/schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VatRule.name, schema: VatRuleSchema },
      { name: VatTransaction.name, schema: VatTransactionSchema },
      { name: VatReport.name, schema: VatReportSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
    ]),
  ],
  providers: [VatManagementService, VatManagementResolver],
  controllers: [VatManagementController],
  exports: [VatManagementService],
})
export class VatManagementModule {}
