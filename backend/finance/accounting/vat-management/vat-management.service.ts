import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VatRule, VatRuleDocument } from './shemas/vat-rule.schema';
import { VatTransaction, VatTransactionDocument } from './shemas/vat-transaction.schema';
import { VatReport, VatReportDocument } from './shemas/vat-report.schema';
import { CreateVatTransactionDto } from './dto/create-vat-transaction.dto';
import { CreateVatRuleDto } from './dto/vat-rule.dto';
import { GenerateVatReportDto } from './dto/generate-vat-report.dto';
import { JournalEntryDocument, JournalEntry } from '../journal-entries/schemas/journal-entry.schema';
import { AccountDocument, Account } from '../chart-of-accounts/schemas/account.schema';

@Injectable()
export class VatManagementService {
  constructor(
    @InjectModel(VatRule.name) private ruleModel: Model<VatRuleDocument>,
    @InjectModel(VatTransaction.name) private vatModel: Model<VatTransactionDocument>,
    @InjectModel(VatReport.name) private reportModel: Model<VatReportDocument>,
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  // Manage VAT rules
  async createRule(dto: CreateVatRuleDto) {
    const exists = await this.ruleModel.findOne({ code: dto.code }).lean();
    if (exists) throw new BadRequestException('Vat rule code already exists');
    const r = new this.ruleModel(dto);
    return r.save();
  }

  async listRules() {
    return this.ruleModel.find().lean();
  }

  async getRule(codeOrId: string) {
    if (Types.ObjectId.isValid(codeOrId)) {
      const r = await this.ruleModel.findById(codeOrId).lean();
      if (!r) throw new NotFoundException('Vat rule not found');
      return r;
    }
    const r = await this.ruleModel.findOne({ code: codeOrId }).lean();
    if (!r) throw new NotFoundException('Vat rule not found');
    return r;
  }

  // Helper: resolve vat rule
  private async resolveRule(code?: string, type: 'sale' | 'purchase' = 'sale') {
    if (code) {
      const r = await this.ruleModel.findOne({ code }).lean();
      if (r) return r;
    }
    // fallback: choose first rule that applies to the type
    const fallback = await this.ruleModel.findOne({ $or: [{ appliesTo: type }, { appliesTo: 'both' }] }).lean();
    if (fallback) return fallback;
    // last fallback default: 0% rule
    return { code: 'ZERO', name: 'Zero VAT', rate: 0, appliesTo: 'both' };
  }

  /**
   * Register a VAT transaction (invoice purchase or sale).
   * - computes VAT line amounts using vatRule.rate (or provided vatAmount if you set it later)
   * - creates a JournalEntry that posts base -> revenue/expense accounts and VAT -> VAT accounts
   */
  async registerVatTransaction(dto: CreateVatTransactionDto, postNow = true) {
    // validate dto
    const type = dto.type;
    const date = new Date(dto.date);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    // Prepare lines with computed VAT
    const computedLines = [];
    let totalBase = 0;
    let totalVat = 0;

    for (const l of dto.lines) {
      // ensure account id valid
      if (!Types.ObjectId.isValid(l.account)) throw new BadRequestException('Invalid account id in lines');

      const rule = await this.resolveRule(l.vatRuleCode, type);
      const rate = Number(rule.rate || 0);
      const vatAmount = Number((Number(l.baseAmount || 0) * rate) / 100);
      computedLines.push({
        account: new Types.ObjectId(l.account),
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
      createdBy: dto.createdBy ? new Types.ObjectId(dto.createdBy) : undefined,
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
        throw new BadRequestException('VAT account for payable/receivable not configured. Create an account with metadata.vatAccountType = vat_payable or vat_receivable or code VAT_PAYABLE/VAT_RECEIVABLE');
      }

      // Build journal lines:
      // For sales: base increases revenue (credit) and VAT increases VAT payable (credit). Cash/accounts debited elsewhere (e.g., AR).
      // Simpler approach: for each line, we create two lines: revenue (credit) and VAT (credit), and a single balancing debit to a "counterpart" account (e.g., Accounts Receivable) but we don't know AR here.
      // Best approach: create JE lines that move base to the line.account and VAT to vatAccountForThisType, and a final balancing line to a 'counterpart' account provided by metadata or default.
      const linesForJE: any[] = [];
      let balancingAccountId: any = undefined;
      if (dto.metadata && dto.metadata['counterpartAccount']) {
        if (!Types.ObjectId.isValid(dto.metadata['counterpartAccount'])) throw new BadRequestException('Invalid counterpartAccount metadata');
        balancingAccountId = new Types.ObjectId(dto.metadata['counterpartAccount']);
      } else {
        // fallback: try to find AR/AP generic
        const ar = await this.accountModel.findOne({ $or: [{ 'metadata.accountType': 'receivable' }, { code: 'AR' }] }).lean();
        const ap = await this.accountModel.findOne({ $or: [{ 'metadata.accountType': 'payable' }, { code: 'AP' }] }).lean();
        balancingAccountId = type === 'sale' ? (ar ? ar._id : undefined) : (ap ? ap._id : undefined);
      }

      if (!balancingAccountId) {
        throw new BadRequestException('Counterpart account (AR/AP) not found. Provide metadata.counterpartAccount or create AR/AP accounts.');
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
        } else {
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
      } else if (sumCredit > sumDebit) {
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
        throw new BadRequestException('Internal error assembling VAT Journal Entry: not balanced');
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
  async postVatTransaction(vatTransactionId: string, postedBy?: string) {
    if (!Types.ObjectId.isValid(vatTransactionId)) throw new BadRequestException('Invalid id');
    const vt = await this.vatModel.findById(vatTransactionId);
    if (!vt) throw new NotFoundException('Vat transaction not found');
    if (vt.status === 'posted') throw new BadRequestException('Already posted');

    // For simplicity re-run register logic using vatModel data
    const dto: any = {
      type: vt.type,
      date: vt.date.toISOString(),
      reference: vt.reference,
      lines: vt.lines.map((l: any) => ({ account: String(l.account), baseAmount: l.baseAmount, vatRuleCode: l.vatRuleCode, description: l.description })),
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
      if (postedBy && Types.ObjectId.isValid(postedBy)) vt.postedBy = new Types.ObjectId(postedBy);
      await vt.save();
    }

    return vt;
  }

  // Generate VAT report for period (sums sales/purchases, debit/credit fiscal)
  async generateVatReport(dto: GenerateVatReportDto, generatedBy?: string) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) throw new BadRequestException('Invalid dates');

    // fetch posted vat transactions in period
    const vts = await this.vatModel.find({ status: 'posted', date: { $gte: start, $lte: end } }).lean();

    let totalSalesBase = 0;
    let totalSalesVat = 0;
    let totalPurchasesBase = 0;
    let totalPurchasesVat = 0;

    const byRule: Record<string, { base: number; vat: number }> = {};

    for (const vt of vts) {
      if (!Array.isArray(vt.lines)) continue;
      for (const l of vt.lines) {
        const base = Number(l.baseAmount || 0);
        const vat = Number(l.vatAmount || 0);
        if (vt.type === 'sale') {
          totalSalesBase += base;
          totalSalesVat += vat;
        } else {
          totalPurchasesBase += base;
          totalPurchasesVat += vat;
        }
        const key = l.vatRuleCode || 'ZERO';
        if (!byRule[key]) byRule[key] = { base: 0, vat: 0 };
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
      generatedBy: generatedBy && Types.ObjectId.isValid(generatedBy) ? new Types.ObjectId(generatedBy) : undefined,
    });
    const saved = await doc.save();
    return { result, reportId: saved._id };
  }

  // get saved report
  async getReport(reportId: string) {
    if (!Types.ObjectId.isValid(reportId)) throw new BadRequestException('Invalid id');
    return this.reportModel.findById(reportId).lean();
  }

  async listReports(limit = 50, skip = 0) {
    return this.reportModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }
}
