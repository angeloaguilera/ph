import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MSchema } from 'mongoose';

export type IncomeStatementReportDocument = IncomeStatementReport & Document;

@Schema({ timestamps: true })
export class IncomeStatementReport {
  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Object, required: true })
  result: any; // JSON payload with revenues/expenses/netIncome etc.

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  generatedBy?: Types.ObjectId;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export const IncomeStatementReportSchema = SchemaFactory.createForClass(IncomeStatementReport);
