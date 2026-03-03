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
exports.BankReconciliationSchema = exports.BankReconciliation = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let BankReconciliation = class BankReconciliation {
};
exports.BankReconciliation = BankReconciliation;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'BankStatement', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BankReconciliation.prototype, "bankStatement", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], BankReconciliation.prototype, "startDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], BankReconciliation.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BankReconciliation.prototype, "startingLedgerBalance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BankReconciliation.prototype, "endingLedgerBalance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], BankReconciliation.prototype, "statementClosingBalance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ type: Object }], default: [] }),
    __metadata("design:type", Array)
], BankReconciliation.prototype, "matches", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], BankReconciliation.prototype, "adjustmentAmount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'JournalEntry' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BankReconciliation.prototype, "adjustmentJournalEntry", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['open', 'finalized', 'cancelled'], default: 'open' }),
    __metadata("design:type", String)
], BankReconciliation.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], BankReconciliation.prototype, "finalizedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], BankReconciliation.prototype, "finalizedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], BankReconciliation.prototype, "metadata", void 0);
exports.BankReconciliation = BankReconciliation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], BankReconciliation);
exports.BankReconciliationSchema = mongoose_1.SchemaFactory.createForClass(BankReconciliation);
