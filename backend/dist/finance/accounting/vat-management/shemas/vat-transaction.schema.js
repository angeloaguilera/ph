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
exports.VatTransactionSchema = exports.VatTransaction = exports.VatLine = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let VatLine = class VatLine {
};
exports.VatLine = VatLine;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Account', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], VatLine.prototype, "account", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], VatLine.prototype, "baseAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], VatLine.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], VatLine.prototype, "vatRuleCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], VatLine.prototype, "vatAmount", void 0);
exports.VatLine = VatLine = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VatLine);
let VatTransaction = class VatTransaction {
};
exports.VatTransaction = VatTransaction;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VatTransaction.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], VatTransaction.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VatTransaction.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }], required: true }),
    __metadata("design:type", Array)
], VatTransaction.prototype, "lines", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'USD' }),
    __metadata("design:type", String)
], VatTransaction.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], VatTransaction.prototype, "exchangeRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['draft', 'posted', 'cancelled'], default: 'draft' }),
    __metadata("design:type", String)
], VatTransaction.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], VatTransaction.prototype, "totalBase", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], VatTransaction.prototype, "totalVat", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'JournalEntry' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], VatTransaction.prototype, "journalEntryRef", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], VatTransaction.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], VatTransaction.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], VatTransaction.prototype, "postedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], VatTransaction.prototype, "postedAt", void 0);
exports.VatTransaction = VatTransaction = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VatTransaction);
exports.VatTransactionSchema = mongoose_1.SchemaFactory.createForClass(VatTransaction);
// pre-validate: compute totals and simple checks
exports.VatTransactionSchema.pre('validate', function (next) {
    const doc = this;
    if (!Array.isArray(doc.lines) || doc.lines.length === 0)
        return next(new Error('VAT transaction must contain at least one line'));
    let totalBase = 0;
    let totalVat = 0;
    for (const l of doc.lines) {
        const base = Number(l.baseAmount || 0);
        const vat = Number(l.vatAmount || 0);
        if (base < 0 || vat < 0)
            return next(new Error('baseAmount and vatAmount must be non-negative'));
        totalBase += base;
        totalVat += vat;
    }
    doc.totalBase = totalBase;
    doc.totalVat = totalVat;
    next();
});
