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
exports.JournalEntriesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const journal_entry_schema_1 = require("./schemas/journal-entry.schema");
let JournalEntriesService = class JournalEntriesService {
    constructor(journalModel) {
        this.journalModel = journalModel;
    }
    checkBalanced(lines) {
        let totalDebit = 0;
        let totalCredit = 0;
        for (const l of lines) {
            totalDebit += Number(l.debit || 0);
            totalCredit += Number(l.credit || 0);
        }
        const eps = 0.000001;
        if (Math.abs(totalDebit - totalCredit) > eps) {
            throw new common_1.BadRequestException(`Journal entry not balanced: totalDebit=${totalDebit} totalCredit=${totalCredit}`);
        }
        return { totalDebit, totalCredit };
    }
    async create(dto) {
        // check lines
        const { totalDebit, totalCredit } = this.checkBalanced(dto.lines);
        const created = new this.journalModel({
            ...dto,
            date: new Date(dto.date),
            totalDebit,
            totalCredit,
            status: 'draft',
            exchangeRate: dto.exchangeRate ?? 1,
        });
        return created.save();
    }
    async findAll(query = {}, limit = 50, skip = 0) {
        return this.journalModel.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean();
    }
    async findOne(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.NotFoundException('Invalid id');
        const doc = await this.journalModel.findById(id);
        if (!doc)
            throw new common_1.NotFoundException('Journal entry not found');
        return doc;
    }
    async update(id, dto) {
        const doc = await this.findOne(id);
        if (!doc)
            throw new common_1.BadRequestException('Cannot update non-existing entry'); // findOne already throws if not found
        if (doc.status === 'posted') {
            throw new common_1.BadRequestException('Cannot update a posted journal entry.');
        }
        // If lines provided, verify balanced
        if (dto.lines) {
            this.checkBalanced(dto.lines);
        }
        if (dto.date)
            dto.date = new Date(dto.date);
        const updated = await this.journalModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
        return updated;
    }
    async remove(id) {
        const doc = await this.findOne(id);
        if (doc.status === 'posted') {
            throw new common_1.BadRequestException('Cannot delete a posted journal entry.');
        }
        await this.journalModel.findByIdAndDelete(id);
        return { deleted: true };
    }
    async post(id, postedBy) {
        const doc = await this.findOne(id);
        if (doc.status === 'posted') {
            throw new common_1.BadRequestException('Entry already posted.');
        }
        // re-check balanced
        this.checkBalanced(doc.lines);
        doc.status = 'posted';
        doc.postedAt = new Date();
        if (postedBy && mongoose_2.Types.ObjectId.isValid(postedBy))
            doc.postedBy = new mongoose_2.Types.ObjectId(postedBy);
        await doc.save();
        // Note: additional integrations (GL posting, ledgers, inventory, tax) would be triggered here.
        return doc;
    }
    async unpost(id) {
        const doc = await this.findOne(id);
        if (doc.status !== 'posted') {
            throw new common_1.BadRequestException('Only posted entries can be unposted.');
        }
        // Business rule: ensure no downstream documents depend on this posting (not implemented here)
        doc.status = 'draft';
        doc.postedAt = undefined;
        doc.postedBy = undefined;
        await doc.save();
        return doc;
    }
    async reverse(id, reason, reversedBy) {
        const doc = await this.findOne(id);
        if (doc.isReversal) {
            throw new common_1.BadRequestException('This entry is itself a reversal.');
        }
        // create reversal entry: swap debit/credit on each line
        const reversedLines = doc.lines.map(l => ({
            account: l.account,
            description: `Reversal of ${doc._id.toString()}${l.description ? ' - ' + l.description : ''}${reason ? ' - ' + reason : ''}`,
            debit: Number(l.credit || 0),
            credit: Number(l.debit || 0),
            taxCode: l.taxCode,
            taxAmount: l.taxAmount ? -Number(l.taxAmount) : 0,
            currency: l.currency ?? doc.currency,
            exchangeRate: l.exchangeRate ?? doc.exchangeRate ?? 1,
        }));
        // verify balanced
        this.checkBalanced(reversedLines);
        const reversal = new this.journalModel({
            description: `Reversal of ${doc._id.toString()}${reason ? ' - ' + reason : ''}`,
            date: new Date(),
            lines: reversedLines,
            status: 'posted', // typically reversal is posted immediately, business rule
            isReversal: true,
            reversalOf: doc._id,
            postedAt: new Date(),
            postedBy: reversedBy && mongoose_2.Types.ObjectId.isValid(reversedBy) ? new mongoose_2.Types.ObjectId(reversedBy) : undefined,
            totalDebit: reversedLines.reduce((s, l) => s + (l.debit || 0), 0),
            totalCredit: reversedLines.reduce((s, l) => s + (l.credit || 0), 0),
        });
        const saved = await reversal.save();
        // mark original as reversed (business rule)
        doc.status = 'reversed';
        await doc.save();
        return saved;
    }
};
exports.JournalEntriesService = JournalEntriesService;
exports.JournalEntriesService = JournalEntriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(journal_entry_schema_1.JournalEntry.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], JournalEntriesService);
