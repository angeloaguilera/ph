import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MSchema } from 'mongoose';

export type CashFlowTransactionDocument = CashFlowTransaction & Document;

export enum CashFlowType {
  RECEIPT = 'receipt',
  PAYMENT = 'payment',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
}

export enum CashFlowStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  RECONCILED = 'reconciled',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class CashFlowTransaction {
  @Prop({ required: true, enum: Object.values(CashFlowType) })
  type: CashFlowType;

  @Prop({ required: true })
  amount: number; // major units. For production consider Decimal128 or integer cents.

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Number, default: 1 })
  exchangeRate: number;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  cashAccount: Types.ObjectId; // account representing cash/bank affected

  @Prop({ type: Types.ObjectId, ref: 'Account', required: false })
  counterpartAccount?: Types.ObjectId; // e.g., revenue, expense, payable, receivable

  @Prop({ type: Types.ObjectId, ref: 'Account', required: false })
  toAccount?: Types.ObjectId; // for transfers: destination account

  @Prop({ type: String, enum: Object.values(CashFlowStatus), default: CashFlowStatus.PENDING })
  status: CashFlowStatus;

  @Prop({ type: String, default: 'manual' })
  source: string; // manual/import/bank

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  journalEntryRef?: Types.ObjectId;

  @Prop({ type: String })
  paymentMethod?: string; // cash/check/transfer/card

  @Prop({ type: String })
  reference?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;

  @Prop({ type: [String], default: [] })
  attachments?: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  completedBy?: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  reconciledAt?: Date;
}

export const CashFlowTransactionSchema = SchemaFactory.createForClass(CashFlowTransaction);

// Basic validations
CashFlowTransactionSchema.pre('validate', function (next) {
  const doc: any = this;
  if (!doc.amount || Number(doc.amount) <= 0) return next(new Error('Amount must be greater than 0'));
  if (!doc.cashAccount) return next(new Error('cashAccount is required'));
  if (doc.type === 'transfer' && !doc.toAccount) return next(new Error('toAccount is required for transfers'));
  next();
});
