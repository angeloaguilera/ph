import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankStatementDocument = BankStatement & Document;

export class BankStatementLine {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true })
  amount: number; // positive for inflow, negative for outflow

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  transactionId?: string; // bank transaction id if present

  @Prop({ type: Boolean, default: false })
  matched?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  matchedJournalEntry?: Types.ObjectId;

  @Prop({ type: String })
  matchedBy?: string; // 'auto' | 'manual' | ruleId
}

@Schema({ timestamps: true })
export class BankStatement {
  @Prop({ required: true })
  accountName: string;

  @Prop({ required: true })
  bankAccountId: string; // reference to chart-of-accounts account code or id

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  statementDate: Date; // date of statement (e.g., statement closing date)

  @Prop({ type: Number })
  openingBalance?: number;

  @Prop({ type: Number })
  closingBalance?: number;

  @Prop({ type: [{ type: Object }], default: [] })
  lines: BankStatementLine[];

  @Prop({ type: String })
  sourceFileName?: string;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export const BankStatementSchema = SchemaFactory.createForClass(BankStatement);
