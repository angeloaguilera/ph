import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JournalEntry, JournalEntryDocument } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountDocument } from '../chart-of-accounts/schemas/account.schema';
import { GenerateCashFlowDto } from './dto/generate-cash-flow.dto';
import { CashFlowReport, CashFlowReportDocument } from './schemas/cash-flow-report.schema';

@Injectable()
export class CashFlowStatementService {
  constructor(
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(CashFlowReport.name) private reportModel: Model<CashFlowReportDocument>,
  ) {}

  // Heuristic to discover cash accounts if user doesn't provide them
  private async detectCashAccounts(): Promise<string[]> {
    // look for accounts with name containing 'cash' (case-insensitive) OR metadata.isCash === 'true'
    const candidates = await this.accountModel.find({
      $or: [
        { name: { $regex: /cash/i } },
        { 'metadata.isCash': 'true' },
      ],
    }).lean();

    if (candidates && candidates.length) {
      return candidates.map(c => String(c._id));
    }

    // Fallback: try accounts with code starting with '1' (common cash/asset block) and small level
    const fallback = await this.accountModel.find({ code: { $regex: '^1' }, allowPosting: true }).limit(50).lean();
    return fallback.map(f => String(f._id));
  }

  /**
   * Generate cash flow statement
   * - method: 'direct' uses cash lines attribution
   * - method: 'indirect' provides simplified reconciliation starting from net income (best-effort)
   */
  async generate(dto: GenerateCashFlowDto, generatedBy?: string) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    if (end < start) throw new BadRequestException('endDate must be >= startDate');

    const currency = dto.currency ?? 'USD';
    const method = dto.method ?? 'direct';

    // 1) Identify cash accounts
    let cashAccountIds = (dto.cashAccountIds ?? []).filter(id => Types.ObjectId.isValid(id));
    if (!cashAccountIds || cashAccountIds.length === 0) {
      cashAccountIds = await this.detectCashAccounts();
    }
    const cashAccountIdSet = new Set(cashAccountIds.map(id => String(id)));

    // 2) Fetch posted journal entries in date range
    const entries = await this.journalModel.find({
      status: 'posted',
      date: { $gte: start, $lte: end },
    }).lean();

    // 3) Preload accounts used in entries (for classification)
    const accIdSet = new Set<string>();
    for (const e of entries) {
      if (!Array.isArray(e.lines)) continue;
      for (const l of e.lines) {
        if (l && l.account) accIdSet.add(String(l.account));
      }
    }
    const accIds = Array.from(accIdSet).map(id => new Types.ObjectId(id));
    const accounts = accIds.length ? await this.accountModel.find({ _id: { $in: accIds } }).lean() : [];
    const accountMap = new Map<string, Account & { _id: any }>();
    accounts.forEach(a => accountMap.set(String(a._id), a as any));

    // accumulators
    let operating = 0;
    let investing = 0;
    let financing = 0;
    let totalCashChange = 0;

    // Helper: convert line amounts to reporting currency using exchangeRate fields
    const convertLine = (line: any, entry: any) => {
      const rawDebit = Number(line.debit || 0);
      const rawCredit = Number(line.credit || 0);
      const lineExch = Number(line.exchangeRate ?? entry.exchangeRate ?? 1);
      const debit = rawDebit * lineExch;
      const credit = rawCredit * lineExch;
      // signed amount from perspective of account: debit increases that account, credit decreases
      const signed = debit - credit;
      return { debit, credit, signed };
    };

    // Iterate entries
    for (const entry of entries) {
      if (!Array.isArray(entry.lines)) continue;

      // Find cash lines and other lines
      const cashLines = entry.lines.filter((l: any) => l && l.account && cashAccountIdSet.has(String(l.account)));
      const otherLines = entry.lines.filter((l: any) => l && l.account && !cashAccountIdSet.has(String(l.account)));

      // Compute cash change for this entry (sum debit - credit for cash accounts)
      let entryCashChange = 0;
      for (const cl of cashLines) {
        const { signed } = convertLine(cl, entry);
        entryCashChange += signed;
      }

      // classify other lines totals by category
      const categoryTotals: { operating: number; investing: number; financing: number } = { operating: 0, investing: 0, financing: 0 };
      let totalOtherAbs = 0;

      for (const ol of otherLines) {
        const acc = accountMap.get(String(ol.account));
        const accType = (acc && acc.type) ? String(acc.type) : 'other';
        const { signed } = convertLine(ol, entry);
        const absVal = Math.abs(signed);
        totalOtherAbs += absVal;
        if (accType === 'revenue' || accType === 'expense') {
          categoryTotals.operating += absVal;
        } else if (accType === 'asset') {
          // asset (non-cash) movements likely investing
          categoryTotals.investing += absVal;
        } else if (accType === 'liability' || accType === 'equity') {
          categoryTotals.financing += absVal;
        } else {
          // default to operating
          categoryTotals.operating += absVal;
        }
      }

      // Allocation of cash change to categories proportionally to other lines magnitudes
      if (Math.abs(entryCashChange) > 0) {
        if (totalOtherAbs === 0) {
          // if no other lines (cash-only transaction) treat as operating by default
          operating += entryCashChange;
        } else {
          const opsShare = categoryTotals.operating / totalOtherAbs;
          const invShare = categoryTotals.investing / totalOtherAbs;
          const finShare = categoryTotals.financing / totalOtherAbs;
          operating += entryCashChange * opsShare;
          investing += entryCashChange * invShare;
          financing += entryCashChange * finShare;
        }
      }

      totalCashChange += entryCashChange;
    }

    // For indirect method: produce simplified reconciliation (best-effort)
    let indirect = null;
    if (method === 'indirect') {
      // compute net income using revenue & expense accounts from entries (simple)
      let totalRevenue = 0;
      let totalExpense = 0;
      for (const entry of entries) {
        if (!Array.isArray(entry.lines)) continue;
        for (const l of entry.lines) {
          const acc = accountMap.get(String(l.account));
          const accType = (acc && acc.type) ? String(acc.type) : 'other';
          const normalBalance = (acc && acc.normalBalance) ? String(acc.normalBalance) : 'debit';
          const { signed } = convertLine(l, entry);

          // For revenue accounts, treat increases in credit as revenue.
          // Use normalBalance to decide sign safely even if acc is undefined.
          if (accType === 'revenue') {
            // If normalBalance is 'credit', a positive signed (debit-credit) means decrease -> invert sign
            totalRevenue += (normalBalance === 'credit') ? (-(Number(signed))) : Number(signed);
          } else if (accType === 'expense') {
            // For expense accounts (normal debit), positive signed increases expense
            totalExpense += (normalBalance === 'debit') ? Number(signed) : (-(Number(signed)));
          }
        }
      }
      const netIncome = totalRevenue - totalExpense;
      indirect = {
        netIncome,
        adjustments: {
          depreciationAndAmortization: 0, // placeholder (would require tagging lines)
          changesInWorkingCapital: totalCashChange - netIncome, // rough estimate
        },
      };
    }

    const result = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      currency,
      method,
      operating: Number(operating),
      investing: Number(investing),
      financing: Number(financing),
      totalCashChange: Number(totalCashChange),
      indirect,
      generatedAt: new Date().toISOString(),
      numEntriesConsidered: entries.length,
      detectedCashAccounts: Array.from(cashAccountIdSet),
    };

    // Optionally save
    let saved: any = null;
    if (dto.saveReport) {
      const doc = new this.reportModel({
        startDate: start,
        endDate: end,
        currency,
        method,
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
