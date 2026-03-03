"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRepositoryModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const balance_sheet_report_schema_1 = require("../balance-sheet/schemas/balance-sheet-report.schema");
const report_repository_service_1 = require("./report-repository.service");
let ReportRepositoryModule = class ReportRepositoryModule {
};
exports.ReportRepositoryModule = ReportRepositoryModule;
exports.ReportRepositoryModule = ReportRepositoryModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: balance_sheet_report_schema_1.BalanceSheetReport.name, schema: balance_sheet_report_schema_1.BalanceSheetReportSchema }])],
        providers: [report_repository_service_1.ReportRepositoryService],
        exports: [report_repository_service_1.ReportRepositoryService],
    })
], ReportRepositoryModule);
