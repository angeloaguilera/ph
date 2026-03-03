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
exports.BalanceSheetService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const journal_entry_schema_1 = require("../journal-entries/schemas/journal-entry.schema");
const account_schema_1 = require("../chart-of-accounts/schemas/account.schema");
const balance_sheet_report_schema_1 = require("./schemas/balance-sheet-report.schema");
let BalanceSheetService = class BalanceSheetService {
    constructor(journalModel, accountModel, reportModel) {
        this.journalModel = journalModel;
        this.accountModel = accountModel;
        this.reportModel = reportModel;
    }
    /**
     * Generate a balance sheet as of snapshotDate (inclusive).
     * Approach:
     *  - Fetch posted journal entries with date <= snapshotDate
     *  - Aggregate balances per account: balance = sum(debit - credit)
     *  - Group accounts by account.type (asset/liability/equity/other)
     *  - For presentation, assets use balance as-is (debit positive),
     *    liabilities/equity shown as positive amounts by negating balance when needed.
     */
    async generate(dto, generatedBy) {
        const snapshot = new Date(dto.snapshotDate);
        if (isNaN(snapshot.getTime()))
            throw new common_1.BadRequestException('Invalid snapshotDate');
        const currency = dto.currency ?? 'USD';
        const groupBy = dto.groupBy ?? 'byAccount';
        // 1) fetch journal entries posted on or before snapshot
        const entries = await this.journalModel.find({
            status: 'posted',
            date: { $lte: snapshot },
        }).lean();
        // 2) collect all account ids referenced in lines
        const accountIdSet = new Set();
        for (const e of entries) {
            if (!Array.isArray(e.lines))
                continue;
            for (const l of e.lines) {
                if (l && l.account)
                    accountIdSet.add(String(l.account));
            }
        }
        const accountIds = Array.from(accountIdSet).map(id => new mongoose_2.Types.ObjectId(id));
        // 3) fetch account metadata
        const accounts = accountIds.length ? await this.accountModel.find({ _id: { $in: accountIds } }).lean() : [];
        const accountMap = new Map();
        accounts.forEach(a => accountMap.set(String(a._id), a));
        // 4) compute balances per account
        const balanceMap = new Map(); // accountId -> debit-credit
        for (const e of entries) {
            if (!Array.isArray(e.lines))
                continue;
            for (const l of e.lines) {
                if (!l || !l.account)
                    continue;
                const accId = String(l.account);
                const debit = Number(l.debit || 0);
                const credit = Number(l.credit || 0);
                const prev = balanceMap.get(accId) ?? 0;
                balanceMap.set(accId, prev + (debit - credit));
            }
        }
        // 5) classify and assemble result
        const assets = [];
        const liabilities = [];
        const equity = [];
        const others = [];
        for (const [accId, bal] of balanceMap.entries()) {
            const acc = accountMap.get(accId);
            const accType = acc?.type ?? 'other';
            const code = acc?.code ?? accId;
            const name = acc?.name ?? 'Unknown';
            // For presentation, compute positive amount per category:
            // - Asset: amount = balance (debit - credit), typically positive
            // - Liability/Equity: amount = -balance (to show positive numbers for credits)
            let amount = Number(bal);
            let displayAmount = 0;
            if (String(accType) === 'asset') {
                displayAmount = Number(amount);
            }
            else if (String(accType) === 'liability' || String(accType) === 'equity') {
                displayAmount = -Number(amount);
            }
            else {
                // default: use sign convention from account.normalBalance if available
                const normal = (acc && acc.normalBalance) ? String(acc.normalBalance) : 'debit';
                displayAmount = normal === 'credit' ? -Number(amount) : Number(amount);
            }
            const entry = { accountId: accId, code, name, amount: displayAmount };
            if (String(accType) === 'asset')
                assets.push(entry);
            else if (String(accType) === 'liability')
                liabilities.push(entry);
            else if (String(accType) === 'equity')
                equity.push(entry);
            else
                others.push(entry);
        }
        // 6) totals
        const totalAssets = assets.reduce((s, a) => s + Number(a.amount || 0), 0);
        const totalLiabilities = liabilities.reduce((s, a) => s + Number(a.amount || 0), 0);
        const totalEquity = equity.reduce((s, a) => s + Number(a.amount || 0), 0);
        const totalOthers = others.reduce((s, a) => s + Number(a.amount || 0), 0);
        const liabilitiesPlusEquity = totalLiabilities + totalEquity;
        const difference = totalAssets - liabilitiesPlusEquity;
        const result = {
            snapshotDate: snapshot.toISOString(),
            currency,
            groupBy,
            assets: assets.sort((a, b) => (a.code || '').localeCompare(b.code || '')),
            totalAssets,
            liabilities: liabilities.sort((a, b) => (a.code || '').localeCompare(b.code || '')),
            totalLiabilities,
            equity: equity.sort((a, b) => (a.code || '').localeCompare(b.code || '')),
            totalEquity,
            others,
            totalOthers,
            liabilitiesPlusEquity,
            difference, // ideally 0
            generatedAt: new Date().toISOString(),
            numAccounts: balanceMap.size,
            numEntriesConsidered: entries.length,
        };
        // 7) optionally save
        let saved = null;
        if (dto.saveReport) {
            const doc = new this.reportModel({
                snapshotDate: snapshot,
                currency,
                result,
                generatedBy: generatedBy && mongoose_2.Types.ObjectId.isValid(generatedBy) ? new mongoose_2.Types.ObjectId(generatedBy) : undefined,
            });
            saved = await doc.save();
        }
        return { result, savedReportId: saved ? saved._id : null };
    }
    async getReport(reportId) {
        if (!mongoose_2.Types.ObjectId.isValid(reportId))
            throw new common_1.BadRequestException('Invalid report id');
        return this.reportModel.findById(reportId).lean();
    }
    async listReports(limit = 50, skip = 0) {
        return this.reportModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    }
};
exports.BalanceSheetService = BalanceSheetService;
exports.BalanceSheetService = BalanceSheetService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(journal_entry_schema_1.JournalEntry.name)),
    __param(1, (0, mongoose_1.InjectModel)(account_schema_1.Account.name)),
    __param(2, (0, mongoose_1.InjectModel)(balance_sheet_report_schema_1.BalanceSheetReport.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], BalanceSheetService);
