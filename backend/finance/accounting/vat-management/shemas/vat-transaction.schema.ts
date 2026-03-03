import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MSchema } from 'mongoose';

export type VatTransactionDocument = VatTransaction & Document;

@Schema({ timestamps: true })
export class VatLine {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId; // revenue/expense account impacted by base

  @Prop({ type: Number, default: 0 })
  baseAmount: number;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  vatRuleCode?: string; // code linking to VatRule

  @Prop({ type: Number, default: 0 })
  vatAmount?: number;
}

@Schema({ timestamps: true })
export class VatTransaction {
  @Prop({ required: true })
  type: 'sale' | 'purchase'; // sale => VAT devengado, purchase => IVA acreditable

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  reference: string; // invoice number

  @Prop({ type: [{ type: Object }], required: true })
  lines: VatLine[];

  @Prop({ type: String, default: 'USD' })
  currency?: string;

  @Prop({ type: Number, default: 1 })
  exchangeRate?: number;

  @Prop({ type: String, enum: ['draft', 'posted', 'cancelled'], default: 'draft' })
  status?: 'draft' | 'posted' | 'cancelled';

  @Prop({ type: Number, default: 0 })
  totalBase?: number;

  @Prop({ type: Number, default: 0 })
  totalVat?: number;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryRef?: Types.ObjectId;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  postedBy?: Types.ObjectId;

  @Prop({ type: Date })
  postedAt?: Date;
}

export const VatTransactionSchema = SchemaFactory.createForClass(VatTransaction);

// pre-validate: compute totals and simple checks
VatTransactionSchema.pre('validate', function (next) {
  const doc: any = this;
  if (!Array.isArray(doc.lines) || doc.lines.length === 0) return next(new Error('VAT transaction must contain at least one line'));

  let totalBase = 0;
  let totalVat = 0;
  for (const l of doc.lines) {
    const base = Number(l.baseAmount || 0);
    const vat = Number(l.vatAmount || 0);
    if (base < 0 || vat < 0) return next(new Error('baseAmount and vatAmount must be non-negative'));
    totalBase += base;
    totalVat += vat;
  }

  doc.totalBase = totalBase;
  doc.totalVat = totalVat;
  next();
});
