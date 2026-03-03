import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashFlowService } from './cash-flow.service';
import { CashFlowController } from './cash-flow.controller';
import { CashFlowResolver } from './cash-flow.resolver';
import { CashFlowTransaction, CashFlowTransactionSchema } from './schemas/cash-flow-transaction.schema';
import { CashFlowProjection, CashFlowProjectionSchema } from './schemas/cash-flow-projection.schema';
import { JournalEntry, JournalEntrySchema } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountSchema } from '../chart-of-accounts/schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashFlowTransaction.name, schema: CashFlowTransactionSchema },
      { name: CashFlowProjection.name, schema: CashFlowProjectionSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Account.name, schema: AccountSchema },
    ]),
  ],
  providers: [CashFlowService, CashFlowResolver],
  controllers: [CashFlowController],
  exports: [CashFlowService],
})
export class CashFlowModule {}
