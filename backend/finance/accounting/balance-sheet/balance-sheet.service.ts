import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JournalEntry, JournalEntryDocument } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountDocument } from '../chart-of-accounts/schemas/account.schema';
import { GenerateBalanceSheetDto } from './dto/generate-balance-sheet.dto';
import { BalanceSheetReport, BalanceSheetReportDocument } from './schemas/balance-sheet-report.schema';

@Injectable()
export class BalanceSheetService {
  constructor(
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(BalanceSheetReport.name) private reportModel: Model<BalanceSheetReportDocument>,
  ) {}

  /**
   * Generate a balance sheet as of snapshotDate (inclusive).
   * Approach:
   *  - Fetch posted journal entries with date <= snapshotDate
   *  - Aggregate balances per account: balance = sum(debit - credit)
   *  - Group accounts by account.type (asset/liability/equity/other)
   *  - For presentation, assets use balance as-is (debit positive),
   *    liabilities/equity shown as positive amounts by negating balance when needed.
   */
  async generate(dto: GenerateBalanceSheetDto, generatedBy?: string) {
    const snapshot = new Date(dto.snapshotDate);
    if (isNaN(snapshot.getTime())) throw new BadRequestException('Invalid snapshotDate');
    const currency = dto.currency ?? 'USD';
    const groupBy = dto.groupBy ?? 'byAccount';

    // 1) fetch journal entries posted on or before snapshot
    const entries = await this.journalModel.find({
      status: 'posted',
      date: { $lte: snapshot },
    }).lean();

    // 2) collect all account ids referenced in lines
    const accountIdSet = new Set<string>();
    for (const e of entries) {
      if (!Array.isArray(e.lines)) continue;
      for (const l of e.lines) {
        if (l && l.account) accountIdSet.add(String(l.account));
      }
    }
    const accountIds = Array.from(accountIdSet).map(id => new Types.ObjectId(id));

    // 3) fetch account metadata
    const accounts = accountIds.length ? await this.accountModel.find({ _id: { $in: accountIds } }).lean() : [];
    const accountMap = new Map<string, any>();
    accounts.forEach(a => accountMap.set(String(a._id), a));

    // 4) compute balances per account
    const balanceMap = new Map<string, number>(); // accountId -> debit-credit
    for (const e of entries) {
      if (!Array.isArray(e.lines)) continue;
      for (const l of e.lines) {
        if (!l || !l.account) continue;
        const accId = String(l.account);
        const debit = Number(l.debit || 0);
        const credit = Number(l.credit || 0);
        const prev = balanceMap.get(accId) ?? 0;
        balanceMap.set(accId, prev + (debit - credit));
      }
    }

    // 5) classify and assemble result
    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    const others: any[] = [];

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
      } else if (String(accType) === 'liability' || String(accType) === 'equity') {
        displayAmount = -Number(amount);
      } else {
        // default: use sign convention from account.normalBalance if available
        const normal = (acc && acc.normalBalance) ? String(acc.normalBalance) : 'debit';
        displayAmount = normal === 'credit' ? -Number(amount) : Number(amount);
      }

      const entry = { accountId: accId, code, name, amount: displayAmount };

      if (String(accType) === 'asset') assets.push(entry);
      else if (String(accType) === 'liability') liabilities.push(entry);
      else if (String(accType) === 'equity') equity.push(entry);
      else others.push(entry);
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
    let saved: any = null;
    if (dto.saveReport) {
      const doc = new this.reportModel({
        snapshotDate: snapshot,
        currency,
        result,
        generatedBy: generatedBy && Types.ObjectId.isValid(generatedBy) ? new Types.ObjectId(generatedBy) : undefined,
      });
      saved = await doc.save();
    }

    return { result, savedReportId: saved ? saved._id : null };
  }

  async getReport(reportId: string) {
    if (!Types.ObjectId.isValid(reportId)) throw new BadRequestException('Invalid report id');
    return this.reportModel.findById(reportId).lean();
  }

  async listReports(limit = 50, skip = 0) {
    return this.reportModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }
}
