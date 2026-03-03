import { Module } from '@nestjs/common';
import { AccountingModule } from './accounting/accounting.module';

@Module({
  imports: [
    AccountingModule,
  ],
})
export class FinanceModule {}
