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
exports.BankReconciliationController = void 0;
// finance/accounting/bank-reconciliation/bank-reconciliation.controller.ts
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const bank_reconciliation_service_1 = require("./bank-reconciliation.service");
const import_statement_dto_1 = require("./dto/import-statement.dto");
const reconcile_dto_1 = require("./dto/reconcile.dto");
let BankReconciliationController = class BankReconciliationController {
    constructor(svc) {
        this.svc = svc;
    }
    // Upload file (multipart) - fileContent is read in controller and passed as string
    async import(file, body) {
        if (!file)
            throw new Error('File is required');
        const content = file.buffer.toString('utf8');
        return this.svc.importStatement(content, body);
    }
    autoMatch(id, toleranceDays, toleranceAmount) {
        return this.svc.autoMatch(id, { toleranceDays, toleranceAmount });
    }
    manualMatch(dto) {
        return this.svc.manualMatch(dto);
    }
    unmatch(statementId, lineId) {
        return this.svc.unmatch(statementId, lineId);
    }
    startReconciliation(statementId) {
        return this.svc.startReconciliation(statementId);
    }
    finalize(dto) {
        return this.svc.finalize(dto);
    }
    getStatement(id) {
        return this.svc.getStatement(id);
    }
    getUnmatched(statementId) {
        return this.svc.getUnmatchedLines(statementId);
    }
    listReconciliations(limit = '50', skip = '0') {
        return this.svc.listReconciliations(Number(limit), Number(skip));
    }
    getReconciliation(id) {
        return this.svc.getReconciliation(id);
    }
};
exports.BankReconciliationController = BankReconciliationController;
__decorate([
    (0, common_1.Post)('import'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, import_statement_dto_1.ImportBankStatementDto]),
    __metadata("design:returntype", Promise)
], BankReconciliationController.prototype, "import", null);
__decorate([
    (0, common_1.Post)(':id/auto-match'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('toleranceDays')),
    __param(2, (0, common_1.Body)('toleranceAmount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "autoMatch", null);
__decorate([
    (0, common_1.Post)('manual-match'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reconcile_dto_1.ManualMatchDto]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "manualMatch", null);
__decorate([
    (0, common_1.Post)(':statementId/unmatch/:lineId'),
    __param(0, (0, common_1.Param)('statementId')),
    __param(1, (0, common_1.Param)('lineId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "unmatch", null);
__decorate([
    (0, common_1.Post)('start/:statementId'),
    __param(0, (0, common_1.Param)('statementId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "startReconciliation", null);
__decorate([
    (0, common_1.Post)('finalize'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reconcile_dto_1.FinalizeReconciliationDto]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "finalize", null);
__decorate([
    (0, common_1.Get)('statement/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "getStatement", null);
__decorate([
    (0, common_1.Get)('unmatched/:statementId'),
    __param(0, (0, common_1.Param)('statementId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "getUnmatched", null);
__decorate([
    (0, common_1.Get)('reconciliations'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "listReconciliations", null);
__decorate([
    (0, common_1.Get)('reconciliation/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BankReconciliationController.prototype, "getReconciliation", null);
exports.BankReconciliationController = BankReconciliationController = __decorate([
    (0, common_1.Controller)('api/accounting/bank-reconciliation'),
    __metadata("design:paramtypes", [bank_reconciliation_service_1.BankReconciliationService])
], BankReconciliationController);
