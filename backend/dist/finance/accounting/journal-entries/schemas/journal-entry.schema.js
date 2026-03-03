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
exports.JournalEntrySchema = exports.JournalEntry = exports.JournalLine = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
class JournalLine {
}
exports.JournalLine = JournalLine;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Account', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], JournalLine.prototype, "account", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], JournalLine.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], JournalLine.prototype, "debit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], JournalLine.prototype, "credit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], JournalLine.prototype, "taxCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], JournalLine.prototype, "taxAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], JournalLine.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], JournalLine.prototype, "exchangeRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], JournalLine.prototype, "metadata", void 0);
let JournalEntry = class JournalEntry {
};
exports.JournalEntry = JournalEntry;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }], default: [] }),
    __metadata("design:type", Array)
], JournalEntry.prototype, "lines", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], JournalEntry.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, index: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['draft', 'posted', 'reversed'], default: 'draft', index: true }),
    __metadata("design:type", String)
], JournalEntry.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'USD' }),
    __metadata("design:type", String)
], JournalEntry.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "exchangeRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "totalDebit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "totalCredit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], JournalEntry.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], JournalEntry.prototype, "postedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], JournalEntry.prototype, "postedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], JournalEntry.prototype, "isReversal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'JournalEntry' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], JournalEntry.prototype, "reversalOf", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], JournalEntry.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], JournalEntry.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], JournalEntry.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], JournalEntry.prototype, "fiscalPeriod", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], JournalEntry.prototype, "fiscalYear", void 0);
exports.JournalEntry = JournalEntry = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], JournalEntry);
exports.JournalEntrySchema = mongoose_1.SchemaFactory.createForClass(JournalEntry);
// pre-validate: compute totals and ensure lines exist and are numeric
exports.JournalEntrySchema.pre('validate', function (next) {
    const doc = this;
    if (!Array.isArray(doc.lines) || doc.lines.length === 0) {
        return next(new Error('Journal entry must have at least one line.'));
    }
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of doc.lines) {
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        if (debit < 0 || credit < 0) {
            return next(new Error('Line debit/credit cannot be negative.'));
        }
        totalDebit += debit;
        totalCredit += credit;
    }
    // store calculated totals
    doc.totalDebit = totalDebit;
    doc.totalCredit = totalCredit;
    // small epsilon tolerance for floating point
    const eps = 0.000001;
    if (Math.abs(totalDebit - totalCredit) > eps) {
        return next(new Error(`Journal entry not balanced: totalDebit=${totalDebit} totalCredit=${totalCredit}`));
    }
    next();
});
// before save: prevent posting changes to already posted entries (optional safeguard)
exports.JournalEntrySchema.pre('save', function (next) {
    // Allow saves for drafts and reversals; business rules can be refined here.
    next();
});
