import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CashFlowProjectionDocument = CashFlowProjection & Document;

@Schema({ timestamps: true })
export class CashFlowProjection {
  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Object, required: true })
  projection: any; // payload with daily/weekly/monthly inflows/outflows

  @Prop({ type: Types.ObjectId, ref: 'User' })
  generatedBy?: Types.ObjectId;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export const CashFlowProjectionSchema = SchemaFactory.createForClass(CashFlowProjection);
