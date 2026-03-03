"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashFlowStatementModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const cash_flow_statement_service_1 = require("./cash-flow-statement.service");
const cash_flow_statement_controller_1 = require("./cash-flow-statement.controller");
const cash_flow_statement_resolver_1 = require("./cash-flow-statement.resolver");
const cash_flow_report_schema_1 = require("./schemas/cash-flow-report.schema");
const journal_entry_schema_1 = require("../journal-entries/schemas/journal-entry.schema");
const account_schema_1 = require("../chart-of-accounts/schemas/account.schema");
let CashFlowStatementModule = class CashFlowStatementModule {
};
exports.CashFlowStatementModule = CashFlowStatementModule;
exports.CashFlowStatementModule = CashFlowStatementModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: journal_entry_schema_1.JournalEntry.name, schema: journal_entry_schema_1.JournalEntrySchema },
                { name: account_schema_1.Account.name, schema: account_schema_1.AccountSchema },
                { name: cash_flow_report_schema_1.CashFlowReport.name, schema: cash_flow_report_schema_1.CashFlowReportSchema },
            ]),
        ],
        providers: [cash_flow_statement_service_1.CashFlowStatementService, cash_flow_statement_resolver_1.CashFlowStatementResolver],
        controllers: [cash_flow_statement_controller_1.CashFlowStatementController],
        exports: [cash_flow_statement_service_1.CashFlowStatementService],
    })
], CashFlowStatementModule);
