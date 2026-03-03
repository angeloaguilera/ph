import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CashFlowReportDocument = CashFlowReport & Document;

@Schema({ timestamps: true })
export class CashFlowReport {
  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: String, default: 'direct' })
  method: 'direct' | 'indirect';

  @Prop({ type: Object, required: true })
  result: any; // JSON payload with operating/investing/financing details

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  generatedBy?: Types.ObjectId;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export const CashFlowReportSchema = SchemaFactory.createForClass(CashFlowReport);
