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
exports.VatManagementController = void 0;
const common_1 = require("@nestjs/common");
const vat_management_service_1 = require("./vat-management.service");
const create_vat_transaction_dto_1 = require("./dto/create-vat-transaction.dto");
const vat_rule_dto_1 = require("./dto/vat-rule.dto");
const generate_vat_report_dto_1 = require("./dto/generate-vat-report.dto");
let VatManagementController = class VatManagementController {
    constructor(svc) {
        this.svc = svc;
    }
    createRule(dto) {
        return this.svc.createRule(dto);
    }
    listRules() {
        return this.svc.listRules();
    }
    createVatTransaction(dto) {
        return this.svc.registerVatTransaction(dto, true);
    }
    createVatTransactionDraft(dto) {
        return this.svc.registerVatTransaction(dto, false);
    }
    postTransaction(id, postedBy) {
        return this.svc.postVatTransaction(id, postedBy);
    }
    generateReport(dto, generatedBy) {
        return this.svc.generateVatReport(dto, generatedBy);
    }
    getReport(id) {
        return this.svc.getReport(id);
    }
    listReports(limit = '50', skip = '0') {
        return this.svc.listReports(Number(limit), Number(skip));
    }
};
exports.VatManagementController = VatManagementController;
__decorate([
    (0, common_1.Post)('rules'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vat_rule_dto_1.CreateVatRuleDto]),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "createRule", null);
__decorate([
    (0, common_1.Get)('rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "listRules", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_vat_transaction_dto_1.CreateVatTransactionDto]),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "createVatTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/draft'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_vat_transaction_dto_1.CreateVatTransactionDto]),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "createVatTransactionDraft", null);
__decorate([
    (0, common_1.Post)('transactions/:id/post'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('postedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "postTransaction", null);
__decorate([
    (0, common_1.Post)('reports/generate'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Body)('generatedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_vat_report_dto_1.GenerateVatReportDto, String]),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Get)('reports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "getReport", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VatManagementController.prototype, "listReports", null);
exports.VatManagementController = VatManagementController = __decorate([
    (0, common_1.Controller)('api/accounting/vat'),
    __metadata("design:paramtypes", [vat_management_service_1.VatManagementService])
], VatManagementController);
