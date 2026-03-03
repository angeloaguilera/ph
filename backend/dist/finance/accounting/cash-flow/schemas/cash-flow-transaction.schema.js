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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashFlowTransactionSchema = exports.CashFlowTransaction = exports.CashFlowStatus = exports.CashFlowType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var CashFlowType;
(function (CashFlowType) {
    CashFlowType["RECEIPT"] = "receipt";
    CashFlowType["PAYMENT"] = "payment";
    CashFlowType["TRANSFER"] = "transfer";
    CashFlowType["ADJUSTMENT"] = "adjustment";
})(CashFlowType || (exports.CashFlowType = CashFlowType = {}));
var CashFlowStatus;
(function (CashFlowStatus) {
    CashFlowStatus["PENDING"] = "pending";
    CashFlowStatus["COMPLETED"] = "completed";
    CashFlowStatus["RECONCILED"] = "reconciled";
    CashFlowStatus["CANCELLED"] = "cancelled";
})(CashFlowStatus || (exports.CashFlowStatus = CashFlowStatus = {}));
let CashFlowTransaction = class CashFlowTransaction {
};
exports.CashFlowTransaction = CashFlowTransaction;
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(CashFlowType) }),
    __metadata("design:type", String)
], CashFlowTransaction.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CashFlowTransaction.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'USD' }),
    __metadata("design:type", String)
], CashFlowTransaction.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], CashFlowTransaction.prototype, "exchangeRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], CashFlowTransaction.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Account', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CashFlowTransaction.prototype, "cashAccount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Account', required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CashFlowTransaction.prototype, "counterpartAccount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Account', required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CashFlowTransaction.prototype, "toAccount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(CashFlowStatus), default: CashFlowStatus.PENDING }),
    __metadata("design:type", String)
], CashFlowTransaction.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'manual' }),
    __metadata("design:type", String)
], CashFlowTransaction.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'JournalEntry' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CashFlowTransaction.prototype, "journalEntryRef", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], CashFlowTransaction.prototype, "paymentMethod", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], CashFlowTransaction.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], CashFlowTransaction.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], CashFlowTransaction.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], CashFlowTransaction.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CashFlowTransaction.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], CashFlowTransaction.prototype, "completedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], CashFlowTransaction.prototype, "completedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], CashFlowTransaction.prototype, "reconciledAt", void 0);
exports.CashFlowTransaction = CashFlowTransaction = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CashFlowTransaction);
exports.CashFlowTransactionSchema = mongoose_1.SchemaFactory.createForClass(CashFlowTransaction);
// Basic validations
exports.CashFlowTransactionSchema.pre('validate', function (next) {
    const doc = this;
    if (!doc.amount || Number(doc.amount) <= 0)
        return next(new Error('Amount must be greater than 0'));
    if (!doc.cashAccount)
        return next(new Error('cashAccount is required'));
    if (doc.type === 'transfer' && !doc.toAccount)
        return next(new Error('toAccount is required for transfers'));
    next();
});
