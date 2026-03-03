import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JournalEntry, JournalEntryDocument } from './schemas/journal-entry.schema';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';

@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
  ) {}

  private checkBalanced(lines: { debit?: number; credit?: number }[]) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of lines) {
      totalDebit += Number(l.debit || 0);
      totalCredit += Number(l.credit || 0);
    }
    const eps = 0.000001;
    if (Math.abs(totalDebit - totalCredit) > eps) {
      throw new BadRequestException(`Journal entry not balanced: totalDebit=${totalDebit} totalCredit=${totalCredit}`);
    }
    return { totalDebit, totalCredit };
  }

  async create(dto: CreateJournalEntryDto) {
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

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid id');
    const doc = await this.journalModel.findById(id);
    if (!doc) throw new NotFoundException('Journal entry not found');
    return doc;
  }

  async update(id: string, dto: UpdateJournalEntryDto) {
    const doc = await this.findOne(id);
    if (!doc) throw new BadRequestException('Cannot update non-existing entry'); // findOne already throws if not found

    if (doc.status === 'posted') {
      throw new BadRequestException('Cannot update a posted journal entry.');
    }

    // If lines provided, verify balanced
    if ((dto as any).lines) {
      this.checkBalanced((dto as any).lines);
    }

    if (dto.date) (dto as any).date = new Date(dto.date);

    const updated = await this.journalModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    return updated;
  }

  async remove(id: string) {
    const doc = await this.findOne(id);
    if (doc.status === 'posted') {
      throw new BadRequestException('Cannot delete a posted journal entry.');
    }
    await this.journalModel.findByIdAndDelete(id);
    return { deleted: true };
  }

  async post(id: string, postedBy?: string) {
    const doc = await this.findOne(id);
    if (doc.status === 'posted') {
      throw new BadRequestException('Entry already posted.');
    }

    // re-check balanced
    this.checkBalanced(doc.lines as any);

    doc.status = 'posted';
    doc.postedAt = new Date();
    if (postedBy && Types.ObjectId.isValid(postedBy)) doc.postedBy = new Types.ObjectId(postedBy);
    await doc.save();

    // Note: additional integrations (GL posting, ledgers, inventory, tax) would be triggered here.
    return doc;
  }

  async unpost(id: string) {
    const doc = await this.findOne(id);
    if (doc.status !== 'posted') {
      throw new BadRequestException('Only posted entries can be unposted.');
    }
    // Business rule: ensure no downstream documents depend on this posting (not implemented here)
    doc.status = 'draft';
    doc.postedAt = undefined;
    doc.postedBy = undefined;
    await doc.save();
    return doc;
  }

  async reverse(id: string, reason?: string, reversedBy?: string) {
    const doc = await this.findOne(id);
    if (doc.isReversal) {
      throw new BadRequestException('This entry is itself a reversal.');
    }

    // create reversal entry: swap debit/credit on each line
    const reversedLines = (doc.lines as any[]).map(l => ({
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
      postedBy: reversedBy && Types.ObjectId.isValid(reversedBy) ? new Types.ObjectId(reversedBy) : undefined,
      totalDebit: reversedLines.reduce((s, l) => s + (l.debit || 0), 0),
      totalCredit: reversedLines.reduce((s, l) => s + (l.credit || 0), 0),
    });

    const saved = await reversal.save();

    // mark original as reversed (business rule)
    doc.status = 'reversed';
    await doc.save();

    return saved;
  }
}
