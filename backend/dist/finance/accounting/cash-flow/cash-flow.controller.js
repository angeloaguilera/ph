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
exports.CashFlowController = void 0;
const common_1 = require("@nestjs/common");
const cash_flow_service_1 = require("./cash-flow.service");
const create_cash_transaction_dto_1 = require("./dto/create-cash-transaction.dto");
const update_cash_transaction_dto_1 = require("./dto/update-cash-transaction.dto");
const generate_projection_dto_1 = require("./dto/generate-projection.dto");
let CashFlowController = class CashFlowController {
    constructor(svc) {
        this.svc = svc;
    }
    create(dto) {
        return this.svc.create(dto);
    }
    findAll(limit = '50', skip = '0') {
        return this.svc.findAll({}, Number(limit), Number(skip));
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    update(id, dto) {
        return this.svc.update(id, dto);
    }
    remove(id) {
        return this.svc.remove(id);
    }
    complete(id, completedBy, createJournal = true) {
        return this.svc.complete(id, completedBy, createJournal);
    }
    reconcile(id, reconciledAt) {
        return this.svc.reconcile(id, reconciledAt ? new Date(reconciledAt) : undefined);
    }
    cancel(id) {
        return this.svc.cancel(id);
    }
    projection(dto, generatedBy) {
        return this.svc.generateProjection(dto, generatedBy);
    }
};
exports.CashFlowController = CashFlowController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cash_transaction_dto_1.CreateCashFlowTransactionDto]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cash_transaction_dto_1.UpdateCashFlowTransactionDto]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('completedBy')),
    __param(2, (0, common_1.Body)('createJournal')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/reconcile'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reconciledAt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "reconcile", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('projection'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Body)('generatedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_projection_dto_1.GenerateCashProjectionDto, String]),
    __metadata("design:returntype", void 0)
], CashFlowController.prototype, "projection", null);
exports.CashFlowController = CashFlowController = __decorate([
    (0, common_1.Controller)('api/accounting/cash-flow'),
    __metadata("design:paramtypes", [cash_flow_service_1.CashFlowService])
], CashFlowController);
