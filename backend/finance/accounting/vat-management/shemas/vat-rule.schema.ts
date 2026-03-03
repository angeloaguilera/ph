import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VatRuleDocument = VatRule & Document;

@Schema({ timestamps: true })
export class VatRule {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Number, required: true })
  rate: number;

  @Prop({ type: String, default: 'sale' })
  appliesTo: 'sale' | 'purchase' | 'both';

  @Prop({ type: Boolean, default: false })
  isRetention?: boolean;

  @Prop({ type: Boolean, default: false })
  isPerception?: boolean;

  @Prop({ type: String, default: 'default' })
  country?: string;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;
}

export const VatRuleSchema = SchemaFactory.createForClass(VatRule);
