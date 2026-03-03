"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankReconciliationModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const bank_reconciliation_service_1 = require("./bank-reconciliation.service");
const bank_reconciliation_controller_1 = require("./bank-reconciliation.controller");
const bank_reconciliation_resolver_1 = require("./bank-reconciliation.resolver");
const bank_statement_schema_1 = require("./schemas/bank-statement.schema");
const bank_reconciliation_schema_1 = require("./schemas/bank-reconciliation.schema");
const journal_entry_schema_1 = require("../journal-entries/schemas/journal-entry.schema");
const account_schema_1 = require("../chart-of-accounts/schemas/account.schema");
let BankReconciliationModule = class BankReconciliationModule {
};
exports.BankReconciliationModule = BankReconciliationModule;
exports.BankReconciliationModule = BankReconciliationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: bank_statement_schema_1.BankStatement.name, schema: bank_statement_schema_1.BankStatementSchema },
                { name: bank_reconciliation_schema_1.BankReconciliation.name, schema: bank_reconciliation_schema_1.BankReconciliationSchema },
                { name: journal_entry_schema_1.JournalEntry.name, schema: journal_entry_schema_1.JournalEntrySchema },
                { name: account_schema_1.Account.name, schema: account_schema_1.AccountSchema },
            ]),
        ],
        providers: [bank_reconciliation_service_1.BankReconciliationService, bank_reconciliation_resolver_1.BankReconciliationResolver],
        controllers: [bank_reconciliation_controller_1.BankReconciliationController],
        exports: [bank_reconciliation_service_1.BankReconciliationService],
    })
], BankReconciliationModule);
