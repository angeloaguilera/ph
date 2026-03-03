import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BalanceSheetReportDocument = BalanceSheetReport & Document;

@Schema({ timestamps: true })
export class BalanceSheetReport {
  @Prop({ type: Date, required: true })
  snapshotDate: Date;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Object, required: true })
  result: any; // JSON with assets/liabilities/equity details

  @Prop({ type: Types.ObjectId, ref: 'User' })
  generatedBy?: Types.ObjectId;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export const BalanceSheetReportSchema = SchemaFactory.createForClass(BalanceSheetReport);
