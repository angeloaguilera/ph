import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BalanceSheetService } from './balance-sheet.service';
import { BalanceSheetController } from './balance-sheet.controller';
import { BalanceSheetResolver } from './balance-sheet.resolver';
import { BalanceSheetReport, BalanceSheetReportSchema } from './schemas/balance-sheet-report.schema';
import { JournalEntry, JournalEntrySchema } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountSchema } from '../chart-of-accounts/schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
      { name: BalanceSheetReport.name, schema: BalanceSheetReportSchema },
    ]),
  ],
  providers: [BalanceSheetService, BalanceSheetResolver],
  controllers: [BalanceSheetController],
  exports: [BalanceSheetService],
})
export class BalanceSheetModule {}
