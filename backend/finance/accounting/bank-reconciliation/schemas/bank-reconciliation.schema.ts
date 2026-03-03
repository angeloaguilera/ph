import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankReconciliationDocument = BankReconciliation & Document;

@Schema({ timestamps: true })
export class BankReconciliation {
  @Prop({ type: Types.ObjectId, ref: 'BankStatement', required: true })
  bankStatement: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ type: Number, required: true })
  startingLedgerBalance: number;

  @Prop({ type: Number, required: true })
  endingLedgerBalance: number;

  @Prop({ type: Number, required: true })
  statementClosingBalance: number;

  @Prop({ type: [{ type: Object }], default: [] })
  matches: any[]; // { statementLineId, journalEntryId, matchedAt, matchType }

  @Prop({ type: Number, default: 0 })
  adjustmentAmount?: number; // if we create adjustment JE

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry' })
  adjustmentJournalEntry?: Types.ObjectId;

  @Prop({ type: String, enum: ['open', 'finalized', 'cancelled'], default: 'open' })
  status?: 'open' | 'finalized' | 'cancelled';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  finalizedBy?: Types.ObjectId;

  @Prop({ type: Date })
  finalizedAt?: Date;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export const BankReconciliationSchema = SchemaFactory.createForClass(BankReconciliation);
