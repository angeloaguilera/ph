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
exports.BankReconciliationResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const bank_reconciliation_service_1 = require("./bank-reconciliation.service");
const bank_reconciliation_graphql_1 = require("./graphql/bank-reconciliation.graphql");
let BankReconciliationResolver = class BankReconciliationResolver {
    constructor(svc) {
        this.svc = svc;
    }
    getStatement(id) {
        return this.svc.getStatement(id);
    }
    async importStatementGraphQL(content, inputJson) {
        // inputJson: serialized ImportBankStatementDto
        const dto = JSON.parse(inputJson);
        const saved = await this.svc.importStatement(content, dto);
        return String(saved._id);
    }
    async autoMatchGraphQL(input) {
        const res = await this.svc.autoMatch(input.statementId, { toleranceDays: input.toleranceDays, toleranceAmount: input.toleranceAmount });
        return `Matches: ${res.matchesFound}`;
    }
};
exports.BankReconciliationResolver = BankReconciliationResolver;
__decorate([
    (0, graphql_1.Query)(() => bank_reconciliation_graphql_1.BankStatementGQL),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankReconciliationResolver.prototype, "getStatement", null);
__decorate([
    (0, graphql_1.Mutation)(() => String),
    __param(0, (0, graphql_1.Args)('content')),
    __param(1, (0, graphql_1.Args)('inputJson')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BankReconciliationResolver.prototype, "importStatementGraphQL", null);
__decorate([
    (0, graphql_1.Mutation)(() => String),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bank_reconciliation_graphql_1.AutoMatchInput]),
    __metadata("design:returntype", Promise)
], BankReconciliationResolver.prototype, "autoMatchGraphQL", null);
exports.BankReconciliationResolver = BankReconciliationResolver = __decorate([
    (0, graphql_1.Resolver)(() => bank_reconciliation_graphql_1.BankStatementGQL),
    __metadata("design:paramtypes", [bank_reconciliation_service_1.BankReconciliationService])
], BankReconciliationResolver);
