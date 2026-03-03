import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JournalEntryDocument = JournalEntry & Document;

export class JournalLine {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  debit: number;

  @Prop({ type: Number, default: 0, min: 0 })
  credit: number;

  @Prop({ type: String })
  taxCode?: string; // e.g., IVA at line level

  @Prop({ type: Number, default: 0 })
  taxAmount?: number;

  @Prop({ type: String })
  currency?: string;

  @Prop({ type: Number, default: 1 })
  exchangeRate?: number;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

@Schema({ timestamps: true })
export class JournalEntry {
  @Prop({ required: true })
  description: string;

  @Prop({ type: [{ type: Object }], default: [] })
  lines: JournalLine[];

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, index: true })
  reference?: string;

  @Prop({ type: String, enum: ['draft', 'posted', 'reversed'], default: 'draft', index: true })
  status: 'draft' | 'posted' | 'reversed';

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Number, default: 1 })
  exchangeRate: number;

  @Prop({ type: Number, default: 0 })
  totalDebit: number;

  @Prop({ type: Number, default: 0 })
  totalCredit: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  postedBy?: Types.ObjectId;

  @Prop({ type: Date })
  postedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isReversal?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  reversalOf?: Types.ObjectId;

  @Prop({ type: String })
  source?: string; // e.g., 'manual', 'import', 'bank'

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;

  @Prop({ type: [String], default: [] })
  attachments?: string[];

  @Prop({ type: String })
  fiscalPeriod?: string; // e.g., '2025-11' or 'Q3-2025'

  @Prop({ type: Number })
  fiscalYear?: number;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);

// pre-validate: compute totals and ensure lines exist and are numeric
JournalEntrySchema.pre('validate', function (next) {
  const doc: any = this;
  if (!Array.isArray(doc.lines) || doc.lines.length === 0) {
    return next(new Error('Journal entry must have at least one line.'));
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of doc.lines) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);
    if (debit < 0 || credit < 0) {
      return next(new Error('Line debit/credit cannot be negative.'));
    }
    totalDebit += debit;
    totalCredit += credit;
  }

  // store calculated totals
  doc.totalDebit = totalDebit;
  doc.totalCredit = totalCredit;

  // small epsilon tolerance for floating point
  const eps = 0.000001;
  if (Math.abs(totalDebit - totalCredit) > eps) {
    return next(new Error(`Journal entry not balanced: totalDebit=${totalDebit} totalCredit=${totalCredit}`));
  }

  next();
});

// before save: prevent posting changes to already posted entries (optional safeguard)
JournalEntrySchema.pre('save', function (next) {
  // Allow saves for drafts and reversals; business rules can be refined here.
  next();
});
