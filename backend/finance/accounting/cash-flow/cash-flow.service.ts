import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CashFlowTransaction,
  CashFlowTransactionDocument,
  CashFlowType,
  CashFlowStatus,
} from './schemas/cash-flow-transaction.schema';
import { CashFlowProjection, CashFlowProjectionDocument } from './schemas/cash-flow-projection.schema';
import { CreateCashFlowTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashFlowTransactionDto } from './dto/update-cash-transaction.dto';
import { GenerateCashProjectionDto } from './dto/generate-projection.dto';
import { JournalEntry, JournalEntryDocument } from '../journal-entries/schemas/journal-entry.schema';
import { Account, AccountDocument } from '../chart-of-accounts/schemas/account.schema';

@Injectable()
export class CashFlowService {
  constructor(
    @InjectModel(CashFlowTransaction.name) private cashModel: Model<CashFlowTransactionDocument>,
    @InjectModel(CashFlowProjection.name) private projModel: Model<CashFlowProjectionDocument>,
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) {}

  // Create cash transaction (does NOT automatically post journal entry)
  async create(dto: CreateCashFlowTransactionDto) {
    // Validate accounts
    if (!Types.ObjectId.isValid(dto.cashAccount)) throw new BadRequestException('Invalid cashAccount id');
    if (dto.toAccount && !Types.ObjectId.isValid(dto.toAccount)) throw new BadRequestException('Invalid toAccount id');
    if (dto.counterpartAccount && !Types.ObjectId.isValid(dto.counterpartAccount)) throw new BadRequestException('Invalid counterpartAccount id');

    const created = new this.cashModel({
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency ?? 'USD',
      exchangeRate: dto.exchangeRate ?? 1,
      date: new Date(dto.date),
      cashAccount: new Types.ObjectId(dto.cashAccount),
      counterpartAccount: dto.counterpartAccount ? new Types.ObjectId(dto.counterpartAccount) : undefined,
      toAccount: dto.toAccount ? new Types.ObjectId(dto.toAccount) : undefined,
      paymentMethod: dto.paymentMethod,
      reference: dto.reference,
      description: dto.description,
      metadata: dto.metadata,
      attachments: dto.attachments ?? [],
      createdBy: dto.createdBy ? new Types.ObjectId(dto.createdBy) : undefined,
      status: CashFlowStatus.PENDING,
    });

    return created.save();
  }

  // list
  async findAll(query: any = {}, limit = 50, skip = 0) {
    return this.cashModel.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean();
  }

  // get one
  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid id');
    const doc = await this.cashModel.findById(id);
    if (!doc) throw new NotFoundException('Cash transaction not found');
    return doc;
  }

  // update (only when not completed/reconciled)
  async update(id: string, dto: UpdateCashFlowTransactionDto) {
    const doc = await this.findOne(id);
    if (doc.status === CashFlowStatus.COMPLETED || doc.status === CashFlowStatus.RECONCILED) {
      throw new BadRequestException('Cannot update a completed or reconciled transaction');
    }
    const patched: any = { ...dto };
    if (dto.date) patched.date = new Date(dto.date);
    if (dto.cashAccount) patched.cashAccount = new Types.ObjectId(dto.cashAccount);
    if (dto.counterpartAccount) patched.counterpartAccount = new Types.ObjectId(dto.counterpartAccount);
    if (dto.toAccount) patched.toAccount = new Types.ObjectId(dto.toAccount);
    const updated = await this.cashModel.findByIdAndUpdate(id, { $set: patched }, { new: true });
    return updated;
  }

  // delete (only if pending)
  async remove(id: string) {
    const doc = await this.findOne(id);
    if (doc.status !== CashFlowStatus.PENDING && doc.status !== CashFlowStatus.CANCELLED) {
      throw new BadRequestException('Only pending or cancelled transactions can be deleted');
    }
    await this.cashModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  // complete (post) a cash transaction -> optionally create a JournalEntry if counterpartAccount provided
  async complete(id: string, completedBy?: string, createJournal = true) {
    const doc = await this.findOne(id);
    if (!doc) throw new NotFoundException('Not found');
    if (doc.status === CashFlowStatus.COMPLETED) throw new BadRequestException('Already completed');

    // normalize type to string to avoid TS comparisons between enum and literal
    const t = String(doc.type);

    // Build journal lines depending on type
    const lines: any[] = [];

    if (t === CashFlowType.TRANSFER) {
      if (!doc.toAccount) throw new BadRequestException('toAccount required for transfer');
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
    } else if (t === CashFlowType.RECEIPT) {
      // receipt: cashAccount debit, counterpart credit
      if (!doc.counterpartAccount) throw new BadRequestException('counterpartAccount is required for receipts');
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
    } else if (t === CashFlowType.PAYMENT) {
      // payment: expense or payable debit, cash credit
      if (!doc.counterpartAccount) throw new BadRequestException('counterpartAccount is required for payments');
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
    } else {
      // adjustment or other types: treat as a positive adjustment to cash by default
      if (!doc.counterpartAccount) throw new BadRequestException('counterpartAccount is required for this transaction type');
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
      throw new BadRequestException('Generated journal lines are not balanced');
    }

    let journalRef: any = undefined;
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
    doc.status = CashFlowStatus.COMPLETED;
    doc.completedAt = new Date();
    if (completedBy && Types.ObjectId.isValid(completedBy)) doc.completedBy = new Types.ObjectId(completedBy);
    if (journalRef) doc.journalEntryRef = journalRef;
    await doc.save();

    return doc;
  }

  // reconcile transaction (mark as reconciled)
  async reconcile(id: string, reconciledAt?: Date) {
    const doc = await this.findOne(id);
    if (doc.status !== CashFlowStatus.COMPLETED) throw new BadRequestException('Only completed transactions can be reconciled');
    doc.status = CashFlowStatus.RECONCILED;
    doc.reconciledAt = reconciledAt ?? new Date();
    await doc.save();
    return doc;
  }

  // cancel
  async cancel(id: string) {
    const doc = await this.findOne(id);
    if (doc.status === CashFlowStatus.RECONCILED) throw new BadRequestException('Cannot cancel reconciled transaction');
    doc.status = CashFlowStatus.CANCELLED;
    await doc.save();
    return { cancelled: true };
  }

  // Simple projection - naive: use historical averages and recurring flagged metadata
  async generateProjection(dto: GenerateCashProjectionDto, generatedBy?: string) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new BadRequestException('Invalid dates');
    if (end < start) throw new BadRequestException('endDate must be >= startDate');

    // fetch historical posted cash transactions last 90 days as sample
    const sampleFrom = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
    const hist = await this.cashModel.find({
      status: { $in: [CashFlowStatus.COMPLETED, CashFlowStatus.RECONCILED] },
      date: { $gte: sampleFrom, $lte: new Date() },
    }).lean();

    // compute average daily inflows/outflows per type
    let inflowTotal = 0;
    let outflowTotal = 0;
    for (const h of hist) {
      const t = String(h.type);
      const amt = Number(h.amount || 0) * Number(h.exchangeRate ?? 1);
      if (t === CashFlowType.RECEIPT) inflowTotal += amt;
      else if (t === CashFlowType.PAYMENT) outflowTotal += amt;
      else if (t === CashFlowType.TRANSFER) {
        // transfers are internal, ignore for net cash
      }
    }
    const daysSample = Math.max(1, (Date.now() - sampleFrom.getTime()) / (1000 * 60 * 60 * 24));
    const avgDailyInflow = inflowTotal / daysSample;
    const avgDailyOutflow = outflowTotal / daysSample;

    // build projection by chosen frequency
    const freq = dto.frequency ?? 'daily';
    const buckets: { date: string; inflow: number; outflow: number; net: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      if (freq === 'daily') {
        const inflow = avgDailyInflow;
        const outflow = avgDailyOutflow;
        buckets.push({ date: cur.toISOString().slice(0, 10), inflow, outflow, net: inflow - outflow });
        cur.setDate(cur.getDate() + 1);
      } else if (freq === 'weekly') {
        const inflow = avgDailyInflow * 7;
        const outflow = avgDailyOutflow * 7;
        buckets.push({ date: cur.toISOString().slice(0, 10), inflow, outflow, net: inflow - outflow });
        cur.setDate(cur.getDate() + 7);
      } else {
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

    let saved: any = null;
    const doc = new this.projModel({
      startDate: start,
      endDate: end,
      currency: dto.currency ?? 'USD',
      projection,
      generatedBy: generatedBy && Types.ObjectId.isValid(generatedBy) ? new Types.ObjectId(generatedBy) : undefined,
    });
    saved = await doc.save();

    return { projection, savedProjectionId: saved._id };
  }
}
