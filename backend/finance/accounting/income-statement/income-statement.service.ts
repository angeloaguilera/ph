import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JournalEntryDocument, JournalEntry } from '../journal-entries/schemas/journal-entry.schema';
import { AccountDocument, Account } from '../chart-of-accounts/schemas/account.schema';
import { GenerateIncomeStatementDto } from './dto/generate-income-statement.dto';
import { IncomeStatementReport, IncomeStatementReportDocument } from './schemas/income-statement-report.schema';

@Injectable()
export class IncomeStatementService {
  constructor(
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(IncomeStatementReport.name) private reportModel: Model<IncomeStatementReportDocument>,
  ) {}

  /**
   * Generate income statement between dates (inclusive)
   */
  async generate(dto: GenerateIncomeStatementDto, generatedBy?: string) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    if (end < start) {
      throw new BadRequestException('endDate must be >= startDate');
    }

    const currency = dto.currency ?? 'USD';
    const groupBy = dto.groupBy ?? 'byAccount';

    // 1) Fetch posted journal entries in date range
    const entries = await this.journalModel.find({
      status: 'posted',
      date: { $gte: start, $lte: end },
    }).lean();

    // 2) Collect unique account IDs used in lines
    const accountIdSet = new Set<string>();
    for (const e of entries) {
      if (!Array.isArray(e.lines)) continue;
      for (const l of e.lines) {
        if (l && l.account) accountIdSet.add(String(l.account));
      }
    }
    const accountIds = Array.from(accountIdSet).map(id => new Types.ObjectId(id));

    // 3) Fetch accounts
    const accounts = await this.accountModel.find({ _id: { $in: accountIds } }).lean();
    const accountMap = new Map<string, Account & { _id: any }>();
    accounts.forEach(a => accountMap.set(String(a._id), a as any));

    // 4) Prepare accumulators
    const revenueMap = new Map<string, { accountId?: string; code?: string; name?: string; amount: number }>();
    const expenseMap = new Map<string, { accountId?: string; code?: string; name?: string; amount: number }>();

    // Helper to add amount to map by account
    const addToMap = (map: Map<string, any>, key: string, payload: any) => {
      if (!map.has(key)) map.set(key, { ...payload, amount: 0 });
      const cur = map.get(key);
      cur.amount = Number(cur.amount) + Number(payload.amount || 0);
      map.set(key, cur);
    };

    // 5) Iterate lines and compute amounts in requested currency
    for (const entry of entries) {
      const entryExchange = entry.exchangeRate ?? 1;
      const entryCurrency = entry.currency ?? currency;

      if (!Array.isArray(entry.lines)) continue;

      for (const line of entry.lines) {
        // numeric values
        const rawDebit = Number(line.debit || 0);
        const rawCredit = Number(line.credit || 0);
        const lineExch = Number(line.exchangeRate ?? entryExchange ?? 1);

        // convert to requested currency: assume exchangeRate means: 1 line.currency * exchangeRate = base currency
        // We treat exchangeRate as multiplier to convert line amounts to reporting currency.
        // If line.currency === dto.currency or undefined, exchangeRate should be 1.
        const debit = rawDebit * lineExch;
        const credit = rawCredit * lineExch;

        // get account info
        const accId = String(line.account);
        const account = accountMap.get(accId);
        const accType = account?.type ?? 'other';
        const normalBalance = account?.normalBalance ?? 'debit';
        const code = account?.code ?? accId;
        const name = account?.name ?? 'Unknown';

        // Determine signed amount according to normal balance:
        // if normalBalance === 'credit': amount = credit - debit (positive increases credit accounts = revenue)
        // else (debit normal): amount = debit - credit (positive increases expense/asset)
        const amount = normalBalance === 'credit' ? (credit - debit) : (debit - credit);

        // Classify: revenue or expense (others ignored for income statement totals)
        if (String(accType) === 'revenue') {
          if (groupBy === 'byAccount') {
            addToMap(revenueMap, accId, { accountId: accId, code, name, amount });
          } else {
            // byCategory: group all revenue into single bucket by account type
            addToMap(revenueMap, 'revenue', { accountId: undefined, code: 'REVENUE', name: 'Revenue', amount });
          }
        } else if (String(accType) === 'expense') {
          if (groupBy === 'byAccount') {
            addToMap(expenseMap, accId, { accountId: accId, code, name, amount });
          } else {
            addToMap(expenseMap, 'expense', { accountId: undefined, code: 'EXPENSE', name: 'Expense', amount });
          }
        } else {
          // optionally include other types if desired — currently skip
        }
      }
    }

    // 6) Convert maps to sorted arrays
    const revenues = Array.from(revenueMap.values())
      .map(r => ({ ...r, amount: Number(r.amount) }))
      .sort((a, b) => b.amount - a.amount);

    const expenses = Array.from(expenseMap.values())
      .map(r => ({ ...r, amount: Number(r.amount) }))
      .sort((a, b) => b.amount - a.amount);

    // 7) Totals
    const totalRevenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);
    const netIncome = totalRevenue - totalExpenses;

    const result = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      currency,
      groupBy,
      revenues,
      totalRevenue,
      expenses,
      totalExpenses,
      netIncome,
      generatedAt: new Date().toISOString(),
      numEntriesConsidered: entries.length,
    };

    // 8) Optionally save
    let saved: any = null;
    if (dto.saveReport) {
      const doc = new this.reportModel({
        startDate: start,
        endDate: end,
        currency,
        result,
        generatedBy: generatedBy && Types.ObjectId.isValid(generatedBy) ? new Types.ObjectId(generatedBy) : undefined,
      });
      saved = await doc.save();
    }

    return { result, savedReportId: saved ? saved._id : null };
  }

  // Get saved report
  async getReport(reportId: string) {
    if (!Types.ObjectId.isValid(reportId)) throw new BadRequestException('Invalid report id');
    return this.reportModel.findById(reportId).lean();
  }

  // List saved reports
  async listReports(limit = 50, skip = 0) {
    return this.reportModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }
}
