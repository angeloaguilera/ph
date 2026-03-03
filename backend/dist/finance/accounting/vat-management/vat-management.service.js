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
exports.VatManagementService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const vat_rule_schema_1 = require("./shemas/vat-rule.schema");
const vat_transaction_schema_1 = require("./shemas/vat-transaction.schema");
const vat_report_schema_1 = require("./shemas/vat-report.schema");
const journal_entry_schema_1 = require("../journal-entries/schemas/journal-entry.schema");
const account_schema_1 = require("../chart-of-accounts/schemas/account.schema");
let VatManagementService = class VatManagementService {
    constructor(ruleModel, vatModel, reportModel, journalModel, accountModel) {
        this.ruleModel = ruleModel;
        this.vatModel = vatModel;
        this.reportModel = reportModel;
        this.journalModel = journalModel;
        this.accountModel = accountModel;
    }
    // Manage VAT rules
    async createRule(dto) {
        const exists = await this.ruleModel.findOne({ code: dto.code }).lean();
        if (exists)
            throw new common_1.BadRequestException('Vat rule code already exists');
        const r = new this.ruleModel(dto);
        return r.save();
    }
    async listRules() {
        return this.ruleModel.find().lean();
    }
    async getRule(codeOrId) {
        if (mongoose_2.Types.ObjectId.isValid(codeOrId)) {
            const r = await this.ruleModel.findById(codeOrId).lean();
            if (!r)
                throw new common_1.NotFoundException('Vat rule not found');
            return r;
        }
        const r = await this.ruleModel.findOne({ code: codeOrId }).lean();
        if (!r)
            throw new common_1.NotFoundException('Vat rule not found');
        return r;
    }
    // Helper: resolve vat rule
    async resolveRule(code, type = 'sale') {
        if (code) {
            const r = await this.ruleModel.findOne({ code }).lean();
            if (r)
                return r;
        }
        // fallback: choose first rule that applies to the type
        const fallback = await this.ruleModel.findOne({ $or: [{ appliesTo: type }, { appliesTo: 'both' }] }).lean();
        if (fallback)
            return fallback;
        // last fallback default: 0% rule
        return { code: 'ZERO', name: 'Zero VAT', rate: 0, appliesTo: 'both' };
    }
    /**
     * Register a VAT transaction (invoice purchase or sale).
     * - computes VAT line amounts using vatRule.rate (or provided vatAmount if you set it later)
     * - creates a JournalEntry that posts base -> revenue/expense accounts and VAT -> VAT accounts
     */
    async registerVatTransaction(dto, postNow = true) {
        // validate dto
        const type = dto.type;
        const date = new Date(dto.date);
        if (isNaN(date.getTime()))
            throw new common_1.BadRequestException('Invalid date');
        // Prepare lines with computed VAT
        const computedLines = [];
        let totalBase = 0;
        let totalVat = 0;
        for (const l of dto.lines) {
            // ensure account id valid
            if (!mongoose_2.Types.ObjectId.isValid(l.account))
                throw new common_1.BadRequestException('Invalid account id in lines');
            const rule = await this.resolveRule(l.vatRuleCode, type);
            const rate = Number(rule.rate || 0);
            const vatAmount = Number((Number(l.baseAmount || 0) * rate) / 100);
            computedLines.push({
                account: new mongoose_2.Types.ObjectId(l.account),
                baseAmount: Number(l.baseAmount || 0),
                vatAmount,
                vatRuleCode: rule.code,
                description: l.description,
                rule,
            });
            totalBase += Number(l.baseAmount || 0);
            totalVat += vatAmount;
        }
        // create VatTransaction document
        const vt = new this.vatModel({
            type,
            date,
            reference: dto.reference,
            lines: computedLines.map(cl => ({
                account: cl.account,
                baseAmount: cl.baseAmount,
                description: cl.description,
                vatRuleCode: cl.vatRuleCode,
                vatAmount: cl.vatAmount,
            })),
            currency: dto.currency ?? 'USD',
            exchangeRate: dto.exchangeRate ?? 1,
            status: postNow ? 'posted' : 'draft',
            totalBase,
            totalVat,
            metadata: dto.metadata,
            createdBy: dto.createdBy ? new mongoose_2.Types.ObjectId(dto.createdBy) : undefined,
        });
        // If postNow -> create JournalEntry that records base and tax
        if (postNow) {
            // Determine VAT accounts: convention / expected accounts in ChartOfAccounts
            // Try to find accounts by metadata or code from chart-of-accounts:
            // - VAT Payable (for sales): account with metadata.vatAccountType === 'vat_payable' or code 'VAT_PAYABLE'
            // - VAT Receivable (for purchases): metadata.vatAccountType === 'vat_receivable' or code 'VAT_RECEIVABLE'
            // - Revenue / Expense accounts are provided per line.account
            const vatPayableAcct = await this.accountModel.findOne({ $or: [{ 'metadata.vatAccountType': 'vat_payable' }, { code: 'VAT_PAYABLE' }] }).lean();
            const vatReceivableAcct = await this.accountModel.findOne({ $or: [{ 'metadata.vatAccountType': 'vat_receivable' }, { code: 'VAT_RECEIVABLE' }] }).lean();
            const vatAccountForThisType = type === 'sale'
                ? (vatPayableAcct ? vatPayableAcct._id : undefined)
                : (vatReceivableAcct ? vatReceivableAcct._id : undefined);
            if (!vatAccountForThisType) {
                // fail-safe: throw so user creates VAT payable/receivable accounts
                throw new common_1.BadRequestException('VAT account for payable/receivable not configured. Create an account with metadata.vatAccountType = vat_payable or vat_receivable or code VAT_PAYABLE/VAT_RECEIVABLE');
            }
            // Build journal lines:
            // For sales: base increases revenue (credit) and VAT increases VAT payable (credit). Cash/accounts debited elsewhere (e.g., AR).
            // Simpler approach: for each line, we create two lines: revenue (credit) and VAT (credit), and a single balancing debit to a "counterpart" account (e.g., Accounts Receivable) but we don't know AR here.
            // Best approach: create JE lines that move base to the line.account and VAT to vatAccountForThisType, and a final balancing line to a 'counterpart' account provided by metadata or default.
            const linesForJE = [];
            let balancingAccountId = undefined;
            if (dto.metadata && dto.metadata['counterpartAccount']) {
                if (!mongoose_2.Types.ObjectId.isValid(dto.metadata['counterpartAccount']))
                    throw new common_1.BadRequestException('Invalid counterpartAccount metadata');
                balancingAccountId = new mongoose_2.Types.ObjectId(dto.metadata['counterpartAccount']);
            }
            else {
                // fallback: try to find AR/AP generic
                const ar = await this.accountModel.findOne({ $or: [{ 'metadata.accountType': 'receivable' }, { code: 'AR' }] }).lean();
                const ap = await this.accountModel.findOne({ $or: [{ 'metadata.accountType': 'payable' }, { code: 'AP' }] }).lean();
                balancingAccountId = type === 'sale' ? (ar ? ar._id : undefined) : (ap ? ap._id : undefined);
            }
            if (!balancingAccountId) {
                throw new common_1.BadRequestException('Counterpart account (AR/AP) not found. Provide metadata.counterpartAccount or create AR/AP accounts.');
            }
            // For each VAT line:
            for (const cl of computedLines) {
                // base: for sale -> credit revenue ; for purchase -> debit expense (we follow sign convention)
                if (type === 'sale') {
                    // credit revenue (line.account)
                    linesForJE.push({
                        account: cl.account,
                        description: cl.description ?? `Base for ${dto.reference}`,
                        debit: 0,
                        credit: cl.baseAmount,
                        currency: vt.currency,
                        exchangeRate: vt.exchangeRate,
                    });
                    // credit vat payable
                    linesForJE.push({
                        account: vatAccountForThisType,
                        description: `VAT ${cl.rule.code} for ${dto.reference}`,
                        debit: 0,
                        credit: cl.vatAmount,
                        currency: vt.currency,
                        exchangeRate: vt.exchangeRate,
                    });
                }
                else {
                    // purchase: debit expense (base)
                    linesForJE.push({
                        account: cl.account,
                        description: cl.description ?? `Base for ${dto.reference}`,
                        debit: cl.baseAmount,
                        credit: 0,
                        currency: vt.currency,
                        exchangeRate: vt.exchangeRate,
                    });
                    // debit vat receivable (VAT amount)
                    linesForJE.push({
                        account: vatAccountForThisType,
                        description: `VAT ${cl.rule.code} for ${dto.reference}`,
                        debit: cl.vatAmount,
                        credit: 0,
                        currency: vt.currency,
                        exchangeRate: vt.exchangeRate,
                    });
                }
            }
            // Balancing line: opposite of sum of above.
            const sumDebit = linesForJE.reduce((s, l) => s + Number(l.debit || 0), 0);
            const sumCredit = linesForJE.reduce((s, l) => s + Number(l.credit || 0), 0);
            if (sumDebit > sumCredit) {
                linesForJE.push({
                    account: balancingAccountId,
                    description: `Balancing for ${dto.reference}`,
                    debit: 0,
                    credit: sumDebit - sumCredit,
                    currency: vt.currency,
                    exchangeRate: vt.exchangeRate,
                });
            }
            else if (sumCredit > sumDebit) {
                linesForJE.push({
                    account: balancingAccountId,
                    description: `Balancing for ${dto.reference}`,
                    debit: sumCredit - sumDebit,
                    credit: 0,
                    currency: vt.currency,
                    exchangeRate: vt.exchangeRate,
                });
            }
            // Validate balanced
            const totalD = linesForJE.reduce((s, l) => s + Number(l.debit || 0), 0);
            const totalC = linesForJE.reduce((s, l) => s + Number(l.credit || 0), 0);
            const eps = 0.000001;
            if (Math.abs(totalD - totalC) > eps) {
                throw new common_1.BadRequestException('Internal error assembling VAT Journal Entry: not balanced');
            }
            // Create JournalEntry and link
            const je = new this.journalModel({
                description: `VAT automatic JE for ${dto.type.toUpperCase()} ${dto.reference}`,
                date,
                lines: linesForJE,
                status: 'posted',
                currency: vt.currency,
                exchangeRate: vt.exchangeRate,
                totalDebit: totalD,
                totalCredit: totalC,
                postedAt: new Date(),
                source: 'vat-management',
            });
            const savedJE = await je.save();
            vt.journalEntryRef = savedJE._id;
        }
        const saved = await vt.save();
        return saved;
    }
    // Post an existing VatTransaction (if created as draft)
    async postVatTransaction(vatTransactionId, postedBy) {
        if (!mongoose_2.Types.ObjectId.isValid(vatTransactionId))
            throw new common_1.BadRequestException('Invalid id');
        const vt = await this.vatModel.findById(vatTransactionId);
        if (!vt)
            throw new common_1.NotFoundException('Vat transaction not found');
        if (vt.status === 'posted')
            throw new common_1.BadRequestException('Already posted');
        // For simplicity re-run register logic using vatModel data
        const dto = {
            type: vt.type,
            date: vt.date.toISOString(),
            reference: vt.reference,
            lines: vt.lines.map((l) => ({ account: String(l.account), baseAmount: l.baseAmount, vatRuleCode: l.vatRuleCode, description: l.description })),
            currency: vt.currency,
            exchangeRate: vt.exchangeRate,
            metadata: vt.metadata ? Object.fromEntries(vt.metadata) : undefined,
            createdBy: vt.createdBy ? String(vt.createdBy) : undefined,
        };
        // mark old doc as posted via registerVatTransaction by setting postNow true; we will update existing doc rather than duplicate
        const saved = await this.registerVatTransaction(dto, true);
        // mark original (vt) as cancelled if we created new one; instead, better update existing: unlink previous and update fields.
        // Simpler: update vt with journalRef from saved (if returned)
        // But here registerVatTransaction created a new document; to keep single doc, we can copy journalRef
        if (saved.journalEntryRef) {
            vt.journalEntryRef = saved.journalEntryRef;
            vt.status = 'posted';
            vt.postedAt = new Date();
            if (postedBy && mongoose_2.Types.ObjectId.isValid(postedBy))
                vt.postedBy = new mongoose_2.Types.ObjectId(postedBy);
            await vt.save();
        }
        return vt;
    }
    // Generate VAT report for period (sums sales/purchases, debit/credit fiscal)
    async generateVatReport(dto, generatedBy) {
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start)
            throw new common_1.BadRequestException('Invalid dates');
        // fetch posted vat transactions in period
        const vts = await this.vatModel.find({ status: 'posted', date: { $gte: start, $lte: end } }).lean();
        let totalSalesBase = 0;
        let totalSalesVat = 0;
        let totalPurchasesBase = 0;
        let totalPurchasesVat = 0;
        const byRule = {};
        for (const vt of vts) {
            if (!Array.isArray(vt.lines))
                continue;
            for (const l of vt.lines) {
                const base = Number(l.baseAmount || 0);
                const vat = Number(l.vatAmount || 0);
                if (vt.type === 'sale') {
                    totalSalesBase += base;
                    totalSalesVat += vat;
                }
                else {
                    totalPurchasesBase += base;
                    totalPurchasesVat += vat;
                }
                const key = l.vatRuleCode || 'ZERO';
                if (!byRule[key])
                    byRule[key] = { base: 0, vat: 0 };
                byRule[key].base += base;
                byRule[key].vat += vat;
            }
        }
        const debitFiscal = totalSalesVat;
        const creditFiscal = totalPurchasesVat;
        const vatPayable = debitFiscal - creditFiscal; // positive => payable
        const result = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            totalSalesBase,
            totalSalesVat,
            totalPurchasesBase,
            totalPurchasesVat,
            debitFiscal,
            creditFiscal,
            vatPayable,
            byRule,
            numTransactions: vts.length,
        };
        // Save report
        const doc = new this.reportModel({
            startDate: start,
            endDate: end,
            currency: dto.currency ?? 'USD',
            result,
            generatedBy: generatedBy && mongoose_2.Types.ObjectId.isValid(generatedBy) ? new mongoose_2.Types.ObjectId(generatedBy) : undefined,
        });
        const saved = await doc.save();
        return { result, reportId: saved._id };
    }
    // get saved report
    async getReport(reportId) {
        if (!mongoose_2.Types.ObjectId.isValid(reportId))
            throw new common_1.BadRequestException('Invalid id');
        return this.reportModel.findById(reportId).lean();
    }
    async listReports(limit = 50, skip = 0) {
        return this.reportModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    }
};
exports.VatManagementService = VatManagementService;
exports.VatManagementService = VatManagementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(vat_rule_schema_1.VatRule.name)),
    __param(1, (0, mongoose_1.InjectModel)(vat_transaction_schema_1.VatTransaction.name)),
    __param(2, (0, mongoose_1.InjectModel)(vat_report_schema_1.VatReport.name)),
    __param(3, (0, mongoose_1.InjectModel)(journal_entry_schema_1.JournalEntry.name)),
    __param(4, (0, mongoose_1.InjectModel)(account_schema_1.Account.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], VatManagementService);
