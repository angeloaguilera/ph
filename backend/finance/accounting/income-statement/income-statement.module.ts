import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IncomeStatementService } from './income-statement.service';
import { IncomeStatementController } from './income-statement.controller';
import { IncomeStatementResolver } from './income-statement.resolver';
import { IncomeStatementReport, IncomeStatementReportSchema } from './schemas/income-statement-report.schema';
import { JournalEntry, JournalEntrySchema } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountSchema } from '../chart-of-accounts/schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
      { name: IncomeStatementReport.name, schema: IncomeStatementReportSchema },
    ]),
  ],
  providers: [IncomeStatementService, IncomeStatementResolver],
  controllers: [IncomeStatementController],
  exports: [IncomeStatementService],
})
export class IncomeStatementModule {}
