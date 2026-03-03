import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationResolver } from './bank-reconciliation.resolver';
import { BankStatement, BankStatementSchema } from './schemas/bank-statement.schema';
import { BankReconciliation, BankReconciliationSchema } from './schemas/bank-reconciliation.schema';
import { JournalEntry, JournalEntrySchema } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountSchema } from '../chart-of-accounts/schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankStatement.name, schema: BankStatementSchema },
      { name: BankReconciliation.name, schema: BankReconciliationSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
    ]),
  ],
  providers: [BankReconciliationService, BankReconciliationResolver],
  controllers: [BankReconciliationController],
  exports: [BankReconciliationService],
})
export class BankReconciliationModule {}
