import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VatReportDocument = VatReport & Document;

@Schema({ timestamps: true })
export class VatReport {
  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: Object, required: true })
  result: any;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  generatedBy?: Types.ObjectId;
}

export const VatReportSchema = SchemaFactory.createForClass(VatReport);
