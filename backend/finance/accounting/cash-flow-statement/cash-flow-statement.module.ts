import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashFlowStatementService } from './cash-flow-statement.service';
import { CashFlowStatementController } from './cash-flow-statement.controller';
import { CashFlowStatementResolver } from './cash-flow-statement.resolver';
import { CashFlowReport, CashFlowReportSchema } from './schemas/cash-flow-report.schema';
import { JournalEntry
    , JournalEntrySchema } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountSchema } from '../chart-of-accounts/schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
      { name: CashFlowReport.name, schema: CashFlowReportSchema },
    ]),
  ],
  providers: [CashFlowStatementService, CashFlowStatementResolver],
  controllers: [CashFlowStatementController],
  exports: [CashFlowStatementService],
})
export class CashFlowStatementModule {}
