"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingModule = void 0;
const common_1 = require("@nestjs/common");
const shared_accounting_module_1 = require("./shared/shared-accounting.module");
const posting_engine_module_1 = require("./posting-engine/posting-engine.module");
const fiscal_period_module_1 = require("./fiscal-period/fiscal-period.module");
const report_repository_module_1 = require("./report-repository/report-repository.module");
const reconciliation_module_1 = require("./reconciliation/reconciliation.module");
// Business modules (you already have many; import them here)
const chart_of_accounts_module_1 = require("./chart-of-accounts/chart-of-accounts.module");
const journal_entries_module_1 = require("./journal-entries/journal-entries.module");
const balance_sheet_module_1 = require("./balance-sheet/balance-sheet.module");
const income_statement_module_1 = require("./income-statement/income-statement.module");
const cash_flow_module_1 = require("./cash-flow/cash-flow.module");
const bank_reconciliation_module_1 = require("./bank-reconciliation/bank-reconciliation.module");
const vat_management_module_1 = require("./vat-management/vat-management.module");
let AccountingModule = class AccountingModule {
};
exports.AccountingModule = AccountingModule;
exports.AccountingModule = AccountingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            shared_accounting_module_1.SharedAccountingModule,
            posting_engine_module_1.PostingEngineModule,
            fiscal_period_module_1.FiscalPeriodModule,
            report_repository_module_1.ReportRepositoryModule,
            reconciliation_module_1.ReconciliationModule,
            // business modules
            chart_of_accounts_module_1.ChartOfAccountsModule,
            journal_entries_module_1.JournalEntriesModule,
            balance_sheet_module_1.BalanceSheetModule,
            income_statement_module_1.IncomeStatementModule,
            cash_flow_module_1.CashFlowModule,
            bank_reconciliation_module_1.BankReconciliationModule,
            vat_management_module_1.VatManagementModule,
        ],
        exports: [posting_engine_module_1.PostingEngineModule, shared_accounting_module_1.SharedAccountingModule, fiscal_period_module_1.FiscalPeriodModule, report_repository_module_1.ReportRepositoryModule],
    })
], AccountingModule);
