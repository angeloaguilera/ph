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
exports.CashFlowService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const cash_flow_transaction_schema_1 = require("./schemas/cash-flow-transaction.schema");
const cash_flow_projection_schema_1 = require("./schemas/cash-flow-projection.schema");
const journal_entry_schema_1 = require("../journal-entries/schemas/journal-entry.schema");
const account_schema_1 = require("../chart-of-accounts/schemas/account.schema");
let CashFlowService = class CashFlowService {
    constructor(cashModel, projModel, journalModel, accountModel) {
        this.cashModel = cashModel;
        this.projModel = projModel;
        this.journalModel = journalModel;
        this.accountModel = accountModel;
    }
    // Create cash transaction (does NOT automatically post journal entry)
    async create(dto) {
        // Validate accounts
        if (!mongoose_2.Types.ObjectId.isValid(dto.cashAccount))
            throw new common_1.BadRequestException('Invalid cashAccount id');
        if (dto.toAccount && !mongoose_2.Types.ObjectId.isValid(dto.toAccount))
            throw new common_1.BadRequestException('Invalid toAccount id');
        if (dto.counterpartAccount && !mongoose_2.Types.ObjectId.isValid(dto.counterpartAccount))
            throw new common_1.BadRequestException('Invalid counterpartAccount id');
        const created = new this.cashModel({
            type: dto.type,
            amount: dto.amount,
            currency: dto.currency ?? 'USD',
            exchangeRate: dto.exchangeRate ?? 1,
            date: new Date(dto.date),
            cashAccount: new mongoose_2.Types.ObjectId(dto.cashAccount),
            counterpartAccount: dto.counterpartAccount ? new mongoose_2.Types.ObjectId(dto.counterpartAccount) : undefined,
            toAccount: dto.toAccount ? new mongoose_2.Types.ObjectId(dto.toAccount) : undefined,
            paymentMethod: dto.paymentMethod,
            reference: dto.reference,
            description: dto.description,
            metadata: dto.metadata,
            attachments: dto.attachments ?? [],
            createdBy: dto.createdBy ? new mongoose_2.Types.ObjectId(dto.createdBy) : undefined,
            status: cash_flow_transaction_schema_1.CashFlowStatus.PENDING,
        });
        return created.save();
    }
    // list
    async findAll(query = {}, limit = 50, skip = 0) {
        return this.cashModel.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean();
    }
    // get one
    async findOne(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.NotFoundException('Invalid id');
        const doc = await this.cashModel.findById(id);
        if (!doc)
            throw new common_1.NotFoundException('Cash transaction not found');
        return doc;
    }
    // update (only when not completed/reconciled)
    async update(id, dto) {
        const doc = await this.findOne(id);
        if (doc.status === cash_flow_transaction_schema_1.CashFlowStatus.COMPLETED || doc.status === cash_flow_transaction_schema_1.CashFlowStatus.RECONCILED) {
            throw new common_1.BadRequestException('Cannot update a completed or reconciled transaction');
        }
        const patched = { ...dto };
        if (dto.date)
            patched.date = new Date(dto.date);
        if (dto.cashAccount)
            patched.cashAccount = new mongoose_2.Types.ObjectId(dto.cashAccount);
        if (dto.counterpartAccount)
            patched.counterpartAccount = new mongoose_2.Types.ObjectId(dto.counterpartAccount);
        if (dto.toAccount)
            patched.toAccount = new mongoose_2.Types.ObjectId(dto.toAccount);
        const updated = await this.cashModel.findByIdAndUpdate(id, { $set: patched }, { new: true });
        return updated;
    }
    // delete (only if pending)
    async remove(id) {
        const doc = await this.findOne(id);
        if (doc.status !== cash_flow_transaction_schema_1.CashFlowStatus.PENDING && doc.status !== cash_flow_transaction_schema_1.CashFlowStatus.CANCELLED) {
            throw new common_1.BadRequestException('Only pending or cancelled transactions can be deleted');
        }
        await this.cashModel.findByIdAndDelete(id);
        return { deleted: true };
    }
    // complete (post) a cash transaction -> optionally create a JournalEntry if counterpartAccount provided
    async complete(id, completedBy, createJournal = true) {
        const doc = await this.findOne(id);
        if (!doc)
            throw new common_1.NotFoundException('Not found');
        if (doc.status === cash_flow_transaction_schema_1.CashFlowStatus.COMPLETED)
            throw new common_1.BadRequestException('Already completed');
        // normalize type to string to avoid TS comparisons between enum and literal
        const t = String(doc.type);
        // Build journal lines depending on type
        const lines = [];
        if (t === cash_flow_transaction_schema_1.CashFlowType.TRANSFER) {
            if (!doc.toAccount)
                throw new common_1.BadRequestException('toAccount required for transfer');
            // debit destination cash, credit source cash (assuming cashAccount is source)
            lines.push({
                account: doc.toAccount,
                description: `Transfer to ${String(doc.toAccount)} reference:${doc.reference ?? ''}`,
                debit: Number(doc.amount),
                credit: 0,
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
            lines.push({
                account: doc.cashAccount,
                description: `Transfer from ${String(doc.cashAccount)} reference:${doc.reference ?? ''}`,
                debit: 0,
                credit: Number(doc.amount),
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
        }
        else if (t === cash_flow_transaction_schema_1.CashFlowType.RECEIPT) {
            // receipt: cashAccount debit, counterpart credit
            if (!doc.counterpartAccount)
                throw new common_1.BadRequestException('counterpartAccount is required for receipts');
            lines.push({
                account: doc.cashAccount,
                description: doc.description ?? 'Cash receipt',
                debit: Number(doc.amount),
                credit: 0,
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
            lines.push({
                account: doc.counterpartAccount,
                description: doc.description ?? 'Counterpart for receipt',
                debit: 0,
                credit: Number(doc.amount),
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
        }
        else if (t === cash_flow_transaction_schema_1.CashFlowType.PAYMENT) {
            // payment: expense or payable debit, cash credit
            if (!doc.counterpartAccount)
                throw new common_1.BadRequestException('counterpartAccount is required for payments');
            lines.push({
                account: doc.counterpartAccount,
                description: doc.description ?? 'Payment counterpart',
                debit: Number(doc.amount),
                credit: 0,
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
            lines.push({
                account: doc.cashAccount,
                description: doc.description ?? 'Cash payment',
                debit: 0,
                credit: Number(doc.amount),
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
        }
        else {
            // adjustment or other types: treat as a positive adjustment to cash by default
            if (!doc.counterpartAccount)
                throw new common_1.BadRequestException('counterpartAccount is required for this transaction type');
            // Default behavior: debit cash, credit counterpart (i.e., increase cash)
            lines.push({
                account: doc.cashAccount,
                description: doc.description ?? 'Adjustment',
                debit: Number(doc.amount),
                credit: 0,
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
            lines.push({
                account: doc.counterpartAccount,
                description: doc.description ?? 'Adjustment counterpart',
                debit: 0,
                credit: Number(doc.amount),
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
            });
        }
        // Ensure balanced
        const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
        const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
        const eps = 0.000001;
        if (Math.abs(totalDebit - totalCredit) > eps) {
            throw new common_1.BadRequestException('Generated journal lines are not balanced');
        }
        let journalRef = undefined;
        if (createJournal) {
            const je = new this.journalModel({
                description: `Auto JE for cash transaction ${String(doc._id)} - ${doc.description ?? ''}`,
                date: doc.date,
                lines,
                status: 'posted',
                currency: doc.currency,
                exchangeRate: doc.exchangeRate ?? 1,
                totalDebit,
                totalCredit,
                postedAt: new Date(),
                isReversal: false,
                source: 'cash-flow',
            });
            const saved = await je.save();
            journalRef = saved._id;
        }
        // update cash transaction
        doc.status = cash_flow_transaction_schema_1.CashFlowStatus.COMPLETED;
        doc.completedAt = new Date();
        if (completedBy && mongoose_2.Types.ObjectId.isValid(completedBy))
            doc.completedBy = new mongoose_2.Types.ObjectId(completedBy);
        if (journalRef)
            doc.journalEntryRef = journalRef;
        await doc.save();
        return doc;
    }
    // reconcile transaction (mark as reconciled)
    async reconcile(id, reconciledAt) {
        const doc = await this.findOne(id);
        if (doc.status !== cash_flow_transaction_schema_1.CashFlowStatus.COMPLETED)
            throw new common_1.BadRequestException('Only completed transactions can be reconciled');
        doc.status = cash_flow_transaction_schema_1.CashFlowStatus.RECONCILED;
        doc.reconciledAt = reconciledAt ?? new Date();
        await doc.save();
        return doc;
    }
    // cancel
    async cancel(id) {
        const doc = await this.findOne(id);
        if (doc.status === cash_flow_transaction_schema_1.CashFlowStatus.RECONCILED)
            throw new common_1.BadRequestException('Cannot cancel reconciled transaction');
        doc.status = cash_flow_transaction_schema_1.CashFlowStatus.CANCELLED;
        await doc.save();
        return { cancelled: true };
    }
    // Simple projection - naive: use historical averages and recurring flagged metadata
    async generateProjection(dto, generatedBy) {
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()))
            throw new common_1.BadRequestException('Invalid dates');
        if (end < start)
            throw new common_1.BadRequestException('endDate must be >= startDate');
        // fetch historical posted cash transactions last 90 days as sample
        const sampleFrom = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
        const hist = await this.cashModel.find({
            status: { $in: [cash_flow_transaction_schema_1.CashFlowStatus.COMPLETED, cash_flow_transaction_schema_1.CashFlowStatus.RECONCILED] },
            date: { $gte: sampleFrom, $lte: new Date() },
        }).lean();
        // compute average daily inflows/outflows per type
        let inflowTotal = 0;
        let outflowTotal = 0;
        for (const h of hist) {
            const t = String(h.type);
            const amt = Number(h.amount || 0) * Number(h.exchangeRate ?? 1);
            if (t === cash_flow_transaction_schema_1.CashFlowType.RECEIPT)
                inflowTotal += amt;
            else if (t === cash_flow_transaction_schema_1.CashFlowType.PAYMENT)
                outflowTotal += amt;
            else if (t === cash_flow_transaction_schema_1.CashFlowType.TRANSFER) {
                // transfers are internal, ignore for net cash
            }
        }
        const daysSample = Math.max(1, (Date.now() - sampleFrom.getTime()) / (1000 * 60 * 60 * 24));
        const avgDailyInflow = inflowTotal / daysSample;
        const avgDailyOutflow = outflowTotal / daysSample;
        // build projection by chosen frequency
        const freq = dto.frequency ?? 'daily';
        const buckets = [];
        const cur = new Date(start);
        while (cur <= end) {
            if (freq === 'daily') {
                const inflow = avgDailyInflow;
                const outflow = avgDailyOutflow;
                buckets.push({ date: cur.toISOString().slice(0, 10), inflow, outflow, net: inflow - outflow });
                cur.setDate(cur.getDate() + 1);
            }
            else if (freq === 'weekly') {
                const inflow = avgDailyInflow * 7;
                const outflow = avgDailyOutflow * 7;
                buckets.push({ date: cur.toISOString().slice(0, 10), inflow, outflow, net: inflow - outflow });
                cur.setDate(cur.getDate() + 7);
            }
            else {
                // monthly
                const month = cur.getMonth();
                const year = cur.getFullYear();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const inflow = avgDailyInflow * daysInMonth;
                const outflow = avgDailyOutflow * daysInMonth;
                buckets.push({ date: `${year}-${(month + 1).toString().padStart(2, '0')}`, inflow, outflow, net: inflow - outflow });
                cur.setMonth(cur.getMonth() + 1);
            }
        }
        const projection = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            frequency: freq,
            buckets,
            avgDailyInflow,
            avgDailyOutflow,
            method: 'historical-average',
            generatedAt: new Date().toISOString(),
            samplePeriodStart: sampleFrom.toISOString(),
        };
        let saved = null;
        const doc = new this.projModel({
            startDate: start,
            endDate: end,
            currency: dto.currency ?? 'USD',
            projection,
            generatedBy: generatedBy && mongoose_2.Types.ObjectId.isValid(generatedBy) ? new mongoose_2.Types.ObjectId(generatedBy) : undefined,
        });
        saved = await doc.save();
        return { projection, savedProjectionId: saved._id };
    }
};
exports.CashFlowService = CashFlowService;
exports.CashFlowService = CashFlowService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(cash_flow_transaction_schema_1.CashFlowTransaction.name)),
    __param(1, (0, mongoose_1.InjectModel)(cash_flow_projection_schema_1.CashFlowProjection.name)),
    __param(2, (0, mongoose_1.InjectModel)(journal_entry_schema_1.JournalEntry.name)),
    __param(3, (0, mongoose_1.InjectModel)(account_schema_1.Account.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], CashFlowService);
