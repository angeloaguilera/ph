import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankStatement, BankStatementDocument } from './schemas/bank-statement.schema';
import { BankReconciliation, BankReconciliationDocument } from './schemas/bank-reconciliation.schema';
import { JournalEntry, JournalEntryDocument } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountDocument } from '../chart-of-accounts/schemas/account.schema';
import { ImportBankStatementDto } from './dto/import-statement.dto';
import { ManualMatchDto, FinalizeReconciliationDto } from './dto/reconcile.dto';

/**
 * NOTE:
 * - This file intentionally avoids external csv parser dependencies.
 * - The included CSV parser handles quoted fields and commas inside quotes.
 */

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectModel(BankStatement.name) private statementModel: Model<BankStatementDocument>,
    @InjectModel(BankReconciliation.name) private reconModel: Model<BankReconciliationDocument>,
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  // --- Simple CSV parser (handles quoted fields and commas inside quotes) ---
  // Returns array of records (objects) using first row as header.
  private parseCSV(content: string, mapping?: any) {
    // split lines (support CRLF and LF)
    const rawLines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (rawLines.length === 0) return [];

    // split by commas but ignore commas inside quotes
    const splitLine = (line: string) => {
      const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/g;
      const parts = line.split(regex).map(p => {
        let v = p.trim();
        // remove surrounding quotes if present
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
        return v;
      });
      return parts;
    };

    const headerParts = splitLine(rawLines[0]);
    const records: any[] = [];

    for (let i = 1; i < rawLines.length; i++) {
      const parts = splitLine(rawLines[i]);
      // if columns mismatch, try to continue (missing trailing fields will be undefined)
      const obj: any = {};
      for (let j = 0; j < headerParts.length; j++) {
        obj[headerParts[j]] = parts[j] ?? '';
      }
      records.push(obj);
    }

    // convert records into lines with mapping (if provided)
    const lines = records.map((r: any) => {
      // deduce mapping if not provided: first three columns assume date, amount, description
      const keys = Object.keys(r);
      const dateKey = mapping?.dateColumn ?? keys[0];
      const amountKey = mapping?.amountColumn ?? keys[1];
      const descKey = mapping?.descriptionColumn ?? keys[2];
      const txIdKey = mapping?.transactionIdColumn ?? keys[3];

      const date = new Date(r[dateKey]);
      const rawAmount = r[amountKey] ?? '0';
      const amount = Number(String(rawAmount).replace(/[^0-9\.\-]/g, '')) || 0;
      return {
        date,
        amount,
        description: r[descKey] ?? '',
        transactionId: r[txIdKey] ?? undefined,
        matched: false,
        matchedJournalEntry: undefined,
        matchedBy: undefined,
      };
    });

    return lines;
  }

  private parseOFX(_content: string) {
    // OFX parsing is non-trivial; placeholder. Recommend installing an OFX parser or
    // sending CSV from your bank export. Return empty for now.
    return [];
  }

  // --- Import statement ---
  async importStatement(fileContent: string, dto: ImportBankStatementDto) {
    // validate account
    if (!Types.ObjectId.isValid(dto.bankAccountId)) throw new BadRequestException('Invalid bankAccountId');
    const acct = await this.accountModel.findById(dto.bankAccountId).lean();
    if (!acct) throw new NotFoundException('Bank account not found');

    let lines: any[] = [];
    const mapping = dto.csvMapping ? JSON.parse(dto.csvMapping) : undefined;

    if (dto.format === 'csv') {
      try {
        lines = this.parseCSV(fileContent, mapping);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BadRequestException('Error parsing CSV: ' + msg);
      }
    } else {
      // ofx
      try {
        lines = this.parseOFX(fileContent);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BadRequestException('Error parsing OFX: ' + msg);
      }
    }

    // compute closing balance as opening + sum(lines) OR if statement provides
    const openingBalance = 0;
    const closingBalance = lines.reduce((s, l) => s + Number(l.amount || 0), 0) + openingBalance;

    const sdoc = new this.statementModel({
      accountName: acct.name ?? acct.code,
      bankAccountId: dto.bankAccountId,
      currency: dto.currency ?? (acct as any).currency ?? 'USD',
      statementDate: new Date(),
      openingBalance,
      closingBalance,
      lines,
      sourceFileName: dto.sourceFileName,
      metadata: dto.metadata ? JSON.parse(dto.metadata) : undefined,
    });

    const saved = await sdoc.save();
    return saved;
  }

  // --- Auto-match algorithm ---
  async autoMatch(statementId: string, options?: { toleranceDays?: number; toleranceAmount?: number }) {
    const s = await this.statementModel.findById(statementId);
    if (!s) throw new NotFoundException('Statement not found');

    const toleranceDays = options?.toleranceDays ?? 2;
    const toleranceAmount = options?.toleranceAmount ?? 0.0001;

    // fetch posted journal entries that touch the bank account
    const bankAccountId = s.bankAccountId;
    if (!bankAccountId) throw new BadRequestException('Bank statement missing bankAccountId');

    const start = new Date(s.statementDate);
    start.setDate(start.getDate() - 60);
    const end = new Date(s.statementDate);
    end.setDate(end.getDate() + 60);

    const jCandidates = await this.journalModel.find({
      date: { $gte: start, $lte: end },
      status: 'posted',
      'lines.account': bankAccountId,
    }).lean();

    // Build array of bank related JE lines
    const bankLines: { journalId: string; date: Date; amount: number; description?: string }[] = [];
    for (const je of jCandidates) {
      for (const l of je.lines as any[]) {
        if (String(l.account) === String(bankAccountId)) {
          const amount = Number(l.debit || 0) - Number(l.credit || 0);
          bankLines.push({ journalId: String(je._id), date: je.date, amount, description: l.description ?? '' });
        }
      }
    }

    const matches: any[] = [];
    const stmtLines = s.lines as any[]; // treat embedded lines as any[] for mutation

    // 1) transactionId exact match
    for (let idx = 0; idx < stmtLines.length; idx++) {
      const line = stmtLines[idx];
      if (line.matched) continue;
      if (line.transactionId) {
        const cand = bankLines.find(b => b.description && String(b.description).includes(String(line.transactionId)));
        if (cand && Math.abs(cand.amount - line.amount) <= toleranceAmount) {
          stmtLines[idx].matched = true;
          stmtLines[idx].matchedJournalEntry = new Types.ObjectId(cand.journalId);
          stmtLines[idx].matchedBy = 'auto:transactionId';
          matches.push({ statementLineIdx: idx, journalEntryId: cand.journalId, type: 'transactionId' });
        }
      }
    }

    // 2) exact amount + date within toleranceDays
    for (let idx = 0; idx < stmtLines.length; idx++) {
      const line = stmtLines[idx];
      if (line.matched) continue;
      const lDate = new Date(line.date);
      const windowStart = new Date(lDate);
      windowStart.setDate(windowStart.getDate() - toleranceDays);
      const windowEnd = new Date(lDate);
      windowEnd.setDate(windowEnd.getDate() + toleranceDays);

      const cand = bankLines.find(b => Math.abs(b.amount - line.amount) <= toleranceAmount && b.date >= windowStart && b.date <= windowEnd);
      if (cand) {
        stmtLines[idx].matched = true;
        stmtLines[idx].matchedJournalEntry = new Types.ObjectId(cand.journalId);
        stmtLines[idx].matchedBy = 'auto:amount_date';
        matches.push({ statementLineIdx: idx, journalEntryId: cand.journalId, type: 'amount_date' });
      }
    }

    // 3) amount match + description substring
    for (let idx = 0; idx < stmtLines.length; idx++) {
      const line = stmtLines[idx];
      if (line.matched) continue;
      const cand = bankLines.find(b => Math.abs(b.amount - line.amount) <= toleranceAmount && b.description && line.description && String(b.description).toLowerCase().includes(String(line.description).toLowerCase().slice(0, 20)));
      if (cand) {
        stmtLines[idx].matched = true;
        stmtLines[idx].matchedJournalEntry = new Types.ObjectId(cand.journalId);
        stmtLines[idx].matchedBy = 'auto:amount_description';
        matches.push({ statementLineIdx: idx, journalEntryId: cand.journalId, type: 'amount_description' });
      }
    }

    await s.save();
    return { statementId: s._id, matchesFound: matches.length, matches };
  }

  // --- Manual match/unmatch ---
  async manualMatch(dto: ManualMatchDto) {
    if (!Types.ObjectId.isValid(dto.statementId)) throw new BadRequestException('Invalid statement id');
    const s = await this.statementModel.findById(dto.statementId);
    if (!s) throw new NotFoundException('Statement not found');

    const stmtLines = s.lines as any[];
    const lineIdx = stmtLines.findIndex((l: any) => String((l as any)._id) === String(dto.statementLineId) || l.transactionId === dto.statementLineId);
    if (lineIdx === -1) throw new NotFoundException('Statement line not found');

    if (!Types.ObjectId.isValid(dto.journalEntryId)) throw new BadRequestException('Invalid journal entry id');
    const je = await this.journalModel.findById(dto.journalEntryId).lean();
    if (!je) throw new NotFoundException('Journal entry not found');

    stmtLines[lineIdx].matched = true;
    stmtLines[lineIdx].matchedJournalEntry = new Types.ObjectId(dto.journalEntryId);
    stmtLines[lineIdx].matchedBy = 'manual';
    await s.save();

    return s;
  }

  async unmatch(statementId: string, statementLineId: string) {
    const s = await this.statementModel.findById(statementId);
    if (!s) throw new NotFoundException('Statement not found');
    const stmtLines = s.lines as any[];
    const lineIdx = stmtLines.findIndex((l: any) => String((l as any)._id) === String(statementLineId) || l.transactionId === statementLineId);
    if (lineIdx === -1) throw new NotFoundException('Statement line not found');
    stmtLines[lineIdx].matched = false;
    stmtLines[lineIdx].matchedJournalEntry = undefined;
    stmtLines[lineIdx].matchedBy = undefined;
    await s.save();
    return s;
  }

  // --- Start reconciliation session ---
  async startReconciliation(statementId: string, startDate?: Date, endDate?: Date) {
    const s = await this.statementModel.findById(statementId).lean();
    if (!s) throw new NotFoundException('Statement not found');
    const recon = new this.reconModel({
      bankStatement: s._id,
      startDate: startDate ?? new Date(s.statementDate),
      endDate: endDate ?? new Date(s.statementDate),
      startingLedgerBalance: 0,
      endingLedgerBalance: 0,
      statementClosingBalance: s.closingBalance ?? 0,
      matches: [],
      status: 'open',
    });
    const saved = await recon.save();
    return saved;
  }

  // --- Finalize reconciliation ---
  async finalize(finalizeDto: FinalizeReconciliationDto) {
    const recon = await this.reconModel.findById(finalizeDto.reconciliationId);
    if (!recon) throw new NotFoundException('Reconciliation not found');
    if (recon.status !== 'open') throw new BadRequestException('Only open reconciliations can be finalized');

    const stmt = await this.statementModel.findById(recon.bankStatement);
    if (!stmt) throw new NotFoundException('Bank statement not found');

    let clearedBankTotal = 0;
    for (const l of stmt.lines as any[]) {
      if (l.matched) clearedBankTotal += Number(l.amount || 0);
    }

    const matchedJournalIds = new Set<string>();
    for (const l of stmt.lines as any[]) {
      if (l.matched && l.matchedJournalEntry) matchedJournalIds.add(String(l.matchedJournalEntry));
    }

    let ledgerClearedTotal = 0;
    for (const jid of matchedJournalIds) {
      const je = await this.journalModel.findById(jid).lean();
      if (!je) continue;
      for (const ln of (je.lines as any[])) {
        if (String(ln.account) === String(stmt.bankAccountId)) {
          ledgerClearedTotal += (Number(ln.debit || 0) - Number(ln.credit || 0));
        }
      }
    }

    const difference = Number(clearedBankTotal) - Number(ledgerClearedTotal);
    let adjustmentJEId = undefined;

    if (Math.abs((finalizeDto.adjustmentAmount ?? 0)) > 0 || Math.abs(difference) > 0.0001) {
      const adjustment = finalizeDto.adjustmentAmount ?? -difference;
      const adjustmentAcct = await this.accountModel.findOne({ $or: [{ 'metadata.accountType': 'recon_diff' }, { code: 'RECON_DIFF' }] }).lean();
      if (!adjustmentAcct) {
        throw new BadRequestException('Adjustment account not found (create account with metadata.accountType = recon_diff or code RECON_DIFF).');
      }

      const bankAcctId = stmt.bankAccountId;
      const amt = Number(adjustment);
      const lines: any[] = [];

      if (amt > 0) {
        lines.push({ account: bankAcctId, debit: amt, credit: 0, description: 'Reconciliation adjustment' });
        lines.push({ account: adjustmentAcct._id, debit: 0, credit: amt, description: 'Reconciliation adjustment' });
      } else {
        const a = Math.abs(amt);
        lines.push({ account: bankAcctId, debit: 0, credit: a, description: 'Reconciliation adjustment' });
        lines.push({ account: adjustmentAcct._id, debit: a, credit: 0, description: 'Reconciliation adjustment' });
      }

      const totalD = lines.reduce((s2, l) => s2 + Number(l.debit || 0), 0);
      const totalC = lines.reduce((s2, l) => s2 + Number(l.credit || 0), 0);
      if (Math.abs(totalD - totalC) > 0.000001) throw new BadRequestException('Adjustment lines not balanced');

      const je = new this.journalModel({
        description: `Bank reconciliation adjustment for statement ${String(stmt._id)}`,
        date: new Date(),
        lines,
        status: 'posted',
        currency: stmt.currency,
        exchangeRate: 1,
        totalDebit: totalD,
        totalCredit: totalC,
        postedAt: new Date(),
        source: 'bank-reconciliation',
      });

      const saved = await je.save();
      adjustmentJEId = saved._id;
      recon.adjustmentAmount = amt;
      recon.adjustmentJournalEntry = adjustmentJEId;
    }

    recon.status = 'finalized';
    if (finalizeDto.finalizedBy && Types.ObjectId.isValid(finalizeDto.finalizedBy)) recon.finalizedBy = new Types.ObjectId(finalizeDto.finalizedBy);
    recon.finalizedAt = new Date();
    await recon.save();

    return { reconciliationId: recon._id, adjustmentJEId, difference, clearedBankTotal, ledgerClearedTotal };
  }

  // Utilities
  async getUnmatchedLines(statementId: string) {
    const s = await this.statementModel.findById(statementId).lean();
    if (!s) throw new NotFoundException('Statement not found');
    return (s.lines as any[]).filter(l => !l.matched);
  }

  async getStatement(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    return this.statementModel.findById(id).lean();
  }

  async listReconciliations(limit = 50, skip = 0) {
    return this.reconModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }

  async getReconciliation(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    return this.reconModel.findById(id).lean();
  }
}
