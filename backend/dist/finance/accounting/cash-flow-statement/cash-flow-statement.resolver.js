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
exports.CashFlowStatementResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const cash_flow_statement_service_1 = require("./cash-flow-statement.service");
const cash_flow_graphql_1 = require("./graphql/cash-flow.graphql");
let CashFlowStatementResolver = class CashFlowStatementResolver {
    constructor(svc) {
        this.svc = svc;
    }
    async generateCashFlow(input) {
        const dto = {
            startDate: input.startDate,
            endDate: input.endDate,
            currency: input.currency,
            method: input.method ?? 'direct',
            cashAccountIds: input.cashAccountIds,
            saveReport: input.saveReport ?? false,
        };
        const { result } = await this.svc.generate(dto);
        return result;
    }
    async getSavedCashFlowReport(reportId) {
        const r = await this.svc.getReport(reportId);
        if (!r)
            return null;
        return r.result;
    }
};
exports.CashFlowStatementResolver = CashFlowStatementResolver;
__decorate([
    (0, graphql_1.Mutation)(() => cash_flow_graphql_1.CashFlowResultGQL),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cash_flow_graphql_1.GenerateCashFlowInput]),
    __metadata("design:returntype", Promise)
], CashFlowStatementResolver.prototype, "generateCashFlow", null);
__decorate([
    (0, graphql_1.Query)(() => cash_flow_graphql_1.CashFlowResultGQL),
    __param(0, (0, graphql_1.Args)('reportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CashFlowStatementResolver.prototype, "getSavedCashFlowReport", null);
exports.CashFlowStatementResolver = CashFlowStatementResolver = __decorate([
    (0, graphql_1.Resolver)(() => cash_flow_graphql_1.CashFlowResultGQL),
    __metadata("design:paramtypes", [cash_flow_statement_service_1.CashFlowStatementService])
], CashFlowStatementResolver);
