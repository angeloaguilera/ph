"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeStatementResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const income_statement_service_1 = require("./income-statement.service");
const income_statement_graphql_1 = require("./graphql/income-statement.graphql");
let IncomeStatementResolver = class IncomeStatementResolver {
    constructor(svc) {
        this.svc = svc;
    }
    async generateIncomeStatement(input) {
        const dto = {
            startDate: input.startDate,
            endDate: input.endDate,
            currency: input.currency,
            groupBy: input.groupBy ?? 'byAccount',
            saveReport: input.saveReport ?? false,
        };
        const { result } = await this.svc.generate(dto);
        return result;
    }
    async getSavedReport(reportId) {
        const r = await this.svc.getReport(reportId);
        if (!r)
            return null;
        return r.result;
    }
};
exports.IncomeStatementResolver = IncomeStatementResolver;
__decorate([
    (0, graphql_1.Mutation)(() => income_statement_graphql_1.IncomeStatementResultGQL),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [income_statement_graphql_1.GenerateIncomeStatementInput]),
    __metadata("design:returntype", Promise)
], IncomeStatementResolver.prototype, "generateIncomeStatement", null);
__decorate([
    (0, graphql_1.Query)(() => income_statement_graphql_1.IncomeStatementResultGQL),
    __param(0, (0, graphql_1.Args)('reportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IncomeStatementResolver.prototype, "getSavedReport", null);
exports.IncomeStatementResolver = IncomeStatementResolver = __decorate([
    (0, graphql_1.Resolver)(() => income_statement_graphql_1.IncomeStatementResultGQL),
    __metadata("design:paramtypes", [income_statement_service_1.IncomeStatementService])
], IncomeStatementResolver);
