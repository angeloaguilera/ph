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
exports.CashFlowResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const cash_flow_service_1 = require("./cash-flow.service");
const cash_flow_graphql_1 = require("./graphql/cash-flow.graphql");
let CashFlowResolver = class CashFlowResolver {
    constructor(svc) {
        this.svc = svc;
    }
    findAll(limit = 50, skip = 0) {
        return this.svc.findAll({}, limit, skip);
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    createCashTransaction(input) {
        // transform to DTO shape
        const dto = {
            ...input,
            date: input.date,
            createdBy: undefined,
        };
        return this.svc.create(dto);
    }
    completeCashTransaction(id, completedBy) {
        return this.svc.complete(id, completedBy, true);
    }
    reconcileCashTransaction(id) {
        return this.svc.reconcile(id).then(() => true);
    }
    cancelCashTransaction(id) {
        return this.svc.cancel(id).then(() => true);
    }
    async generateProjection(startDate, endDate, frequency) {
        const dto = { startDate, endDate, frequency: frequency ?? 'daily' };
        const { savedProjectionId } = await this.svc.generateProjection(dto);
        return String(savedProjectionId);
    }
};
exports.CashFlowResolver = CashFlowResolver;
__decorate([
    (0, graphql_1.Query)(() => [cash_flow_graphql_1.CashFlowTransactionLineGQL], { name: 'cashTransactions' }),
    __param(0, (0, graphql_1.Args)('limit', { type: () => Number, nullable: true })),
    __param(1, (0, graphql_1.Args)('skip', { type: () => Number, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CashFlowResolver.prototype, "findAll", null);
__decorate([
    (0, graphql_1.Query)(() => cash_flow_graphql_1.CashFlowTransactionLineGQL, { name: 'cashTransaction' }),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashFlowResolver.prototype, "findOne", null);
__decorate([
    (0, graphql_1.Mutation)(() => cash_flow_graphql_1.CashFlowTransactionLineGQL),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cash_flow_graphql_1.CashFlowTransactionInput]),
    __metadata("design:returntype", void 0)
], CashFlowResolver.prototype, "createCashTransaction", null);
__decorate([
    (0, graphql_1.Mutation)(() => cash_flow_graphql_1.CashFlowTransactionLineGQL),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Args)('completedBy', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CashFlowResolver.prototype, "completeCashTransaction", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashFlowResolver.prototype, "reconcileCashTransaction", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashFlowResolver.prototype, "cancelCashTransaction", null);
__decorate([
    (0, graphql_1.Mutation)(() => String),
    __param(0, (0, graphql_1.Args)('startDate')),
    __param(1, (0, graphql_1.Args)('endDate')),
    __param(2, (0, graphql_1.Args)('frequency', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CashFlowResolver.prototype, "generateProjection", null);
exports.CashFlowResolver = CashFlowResolver = __decorate([
    (0, graphql_1.Resolver)(() => cash_flow_graphql_1.CashFlowTransactionLineGQL),
    __metadata("design:paramtypes", [cash_flow_service_1.CashFlowService])
], CashFlowResolver);
