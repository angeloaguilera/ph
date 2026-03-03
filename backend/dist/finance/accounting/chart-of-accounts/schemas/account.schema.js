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
exports.AccountSchema = exports.Account = exports.AccountType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var AccountType;
(function (AccountType) {
    AccountType["ASSET"] = "asset";
    AccountType["LIABILITY"] = "liability";
    AccountType["EQUITY"] = "equity";
    AccountType["REVENUE"] = "revenue";
    AccountType["EXPENSE"] = "expense";
    AccountType["OTHER"] = "other";
})(AccountType || (exports.AccountType = AccountType = {}));
let Account = class Account {
};
exports.Account = Account;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], Account.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Account.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: Object.values(AccountType), default: AccountType.ASSET }),
    __metadata("design:type", String)
], Account.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Account', default: null }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Account.prototype, "parent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Account.prototype, "level", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['debit', 'credit'], default: 'debit' }),
    __metadata("design:type", String)
], Account.prototype, "normalBalance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Decimal128, default: () => new mongoose_2.Schema.Types.Decimal128("0") }),
    __metadata("design:type", Object)
], Account.prototype, "balance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Account.prototype, "allowPosting", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'USD' }),
    __metadata("design:type", String)
], Account.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], Account.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Account.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Account.prototype, "isSystemAccount", void 0);
exports.Account = Account = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Account);
exports.AccountSchema = mongoose_1.SchemaFactory.createForClass(Account);
// Indexes
exports.AccountSchema.index({ code: 1 }, { unique: true });
// PRE-SAVE FIXED
exports.AccountSchema.pre('save', async function (next) {
    const doc = this;
    try {
        // LEVEL
        if (doc.parent) {
            const parent = await doc.constructor.findById(doc.parent).lean();
            doc.level = parent ? (parent.level ?? 0) + 1 : 1;
        }
        else {
            doc.level = 0;
        }
        // BALANCE DECIMAL128
        if (doc.balance != null) {
            try {
                doc.balance = new mongoose_2.Schema.Types.Decimal128(String(doc.balance));
            }
            catch (e) {
                console.error("Decimal128 conversion error:", e);
            }
        }
        next();
    }
    catch (err) {
        next(err);
    }
});
// Method for numeric balance
exports.AccountSchema.method('getBalanceNumber', function () {
    const v = this.balance;
    try {
        if (!v)
            return 0;
        if (v.toString)
            return Number(v.toString());
        return Number(v);
    }
    catch {
        return 0;
    }
});
