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
exports.ChartOfAccountsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const account_schema_1 = require("./schemas/account.schema");
let ChartOfAccountsService = class ChartOfAccountsService {
    constructor(accountModel) {
        this.accountModel = accountModel;
    }
    // Create account
    async create(dto) {
        // Normalize code
        const code = dto.code.trim();
        const exists = await this.accountModel.findOne({ code }).lean();
        if (exists)
            throw new common_1.BadRequestException('Account code already exists.');
        const toCreate = {
            code,
            name: dto.name,
            type: dto.type,
            parent: dto.parent ? new mongoose_2.Types.ObjectId(dto.parent) : undefined,
            normalBalance: dto.normalBalance ?? this.defaultNormalBalance(dto.type),
            allowPosting: dto.allowPosting ?? true,
            currency: dto.currency ?? 'USD',
            balance: dto.balance ?? 0,
        };
        const created = new this.accountModel(toCreate);
        return created.save();
    }
    // Default normal balance by type
    defaultNormalBalance(type) {
        if (type === account_schema_1.AccountType.ASSET || type === account_schema_1.AccountType.EXPENSE)
            return 'debit';
        return 'credit';
    }
    // Find all (with optional filters)
    async findAll() {
        return this.accountModel.find().sort({ code: 1 }).lean();
    }
    // Find one
    async findOne(idOrCode) {
        if (mongoose_2.Types.ObjectId.isValid(idOrCode)) {
            const doc = await this.accountModel.findById(idOrCode);
            if (!doc)
                throw new common_1.NotFoundException('Account not found');
            return doc;
        }
        // otherwise search by code
        const doc = await this.accountModel.findOne({ code: idOrCode });
        if (!doc)
            throw new common_1.NotFoundException('Account not found by code');
        return doc;
    }
    // Update
    async update(id, dto) {
        const doc = await this.findOne(id);
        if (doc.isSystemAccount)
            throw new common_1.BadRequestException('System account cannot be updated.');
        if (dto.code && dto.code !== doc.code) {
            const exists = await this.accountModel.findOne({ code: dto.code });
            if (exists)
                throw new common_1.BadRequestException('Another account with that code already exists.');
        }
        // If balance is provided, convert to Decimal128 on save (schema pre-hook will handle)
        const updated = await this.accountModel.findByIdAndUpdate(doc._id, { $set: dto }, { new: true });
        return updated;
    }
    // Remove (only if no children and not system)
    async remove(id) {
        const doc = await this.findOne(id);
        if (doc.isSystemAccount)
            throw new common_1.BadRequestException('Cannot delete system account.');
        const children = await this.accountModel.findOne({ parent: doc._id }).lean();
        if (children)
            throw new common_1.BadRequestException('Cannot delete account with child accounts.');
        await this.accountModel.findByIdAndDelete(doc._id);
        return { deleted: true };
    }
    // Get tree (nested) - useful for UI
    async getTree() {
        const accounts = await this.findAll();
        const map = new Map();
        accounts.forEach(a => {
            map.set(String(a._id), { ...a, children: [] });
        });
        const roots = [];
        for (const a of accounts) {
            if (a.parent) {
                const p = map.get(String(a.parent));
                if (p)
                    p.children.push(map.get(String(a._id)));
                else
                    roots.push(map.get(String(a._id))); // orphaned
            }
            else {
                roots.push(map.get(String(a._id)));
            }
        }
        return roots;
    }
    // Find by code quick
    async findByCode(code) {
        return this.accountModel.findOne({ code }).lean();
    }
    // Adjust balance (atomic): amount in major units, sign depends on normalBalance
    async adjustBalance(accountId, amount) {
        if (!mongoose_2.Types.ObjectId.isValid(accountId))
            throw new common_1.BadRequestException('Invalid account id');
        // amount can be positive or negative
        const res = await this.accountModel.findByIdAndUpdate(accountId, 
        // Using $inc is tricky with Decimal128; Mongoose supports incrementing Decimal128 if value is Decimal128
        // We'll convert to Decimal128 string.
        { $inc: { balance: amount } }, { new: true });
        return res;
    }
};
exports.ChartOfAccountsService = ChartOfAccountsService;
exports.ChartOfAccountsService = ChartOfAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(account_schema_1.Account.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ChartOfAccountsService);
