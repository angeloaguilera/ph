import { Module } from '@nestjs/common';
import { SharedAccountingModule } from './shared/shared-accounting.module';
import { PostingEngineModule } from './posting-engine/posting-engine.module';
import { FiscalPeriodModule } from './fiscal-period/fiscal-period.module';
import { ReportRepositoryModule } from './report-repository/report-repository.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';


// Business modules (you already have many; import them here)
import { ChartOfAccountsModule } from './chart-of-accounts/chart-of-accounts.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { BalanceSheetModule } from './balance-sheet/balance-sheet.module';
import { IncomeStatementModule } from './income-statement/income-statement.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { BankReconciliationModule } from './bank-reconciliation/bank-reconciliation.module';
import { VatManagementModule } from './vat-management/vat-management.module';


@Module({
imports: [
SharedAccountingModule,
PostingEngineModule,
FiscalPeriodModule,
ReportRepositoryModule,
ReconciliationModule,


// business modules
ChartOfAccountsModule,
JournalEntriesModule,
BalanceSheetModule,
IncomeStatementModule,
CashFlowModule,
BankReconciliationModule,
VatManagementModule,
],
exports: [PostingEngineModule, SharedAccountingModule, FiscalPeriodModule, ReportRepositoryModule],
})
export class AccountingModule {}