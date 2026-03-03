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
exports.VatManagementResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const vat_management_service_1 = require("./vat-management.service");
const vat_graphql_1 = require("./graphql/vat.graphql");
let VatManagementResolver = class VatManagementResolver {
    constructor(svc) {
        this.svc = svc;
    }
    async listVatTransactions(limit = 50, skip = 0) {
        // simple find in vatModel - service method could be added
        return this.svc.vatModel.find().sort({ date: -1 }).skip(skip).limit(limit).lean();
    }
    async createVatTransaction(input) {
        // transform to create dto
        const dto = {
            type: input.type,
            date: input.date,
            reference: input.reference,
            lines: input.lines.map(l => ({ account: l.account, baseAmount: l.baseAmount, vatRuleCode: l.vatRuleCode, description: l.description })),
        };
        return this.svc.registerVatTransaction(dto, true);
    }
    async generateVatReport(startDate, endDate) {
        const dto = { startDate, endDate };
        const { reportId } = await this.svc.generateVatReport(dto);
        return String(reportId);
    }
};
exports.VatManagementResolver = VatManagementResolver;
__decorate([
    (0, graphql_1.Query)(() => [vat_graphql_1.VatTransactionGQL], { name: 'vatTransactions' }),
    __param(0, (0, graphql_1.Args)('limit', { type: () => Number, nullable: true })),
    __param(1, (0, graphql_1.Args)('skip', { type: () => Number, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VatManagementResolver.prototype, "listVatTransactions", null);
__decorate([
    (0, graphql_1.Mutation)(() => vat_graphql_1.VatTransactionGQL),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vat_graphql_1.VatTransactionInput]),
    __metadata("design:returntype", Promise)
], VatManagementResolver.prototype, "createVatTransaction", null);
__decorate([
    (0, graphql_1.Mutation)(() => String),
    __param(0, (0, graphql_1.Args)('startDate')),
    __param(1, (0, graphql_1.Args)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], VatManagementResolver.prototype, "generateVatReport", null);
exports.VatManagementResolver = VatManagementResolver = __decorate([
    (0, graphql_1.Resolver)(() => vat_graphql_1.VatTransactionGQL),
    __metadata("design:paramtypes", [vat_management_service_1.VatManagementService])
], VatManagementResolver);
