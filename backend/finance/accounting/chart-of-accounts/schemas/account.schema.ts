import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MSchema } from 'mongoose';

export type AccountDocument = Account & Document;

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: Object.values(AccountType), default: AccountType.ASSET })
  type: AccountType;

  @Prop({ type: Types.ObjectId, ref: 'Account', default: null })
  parent?: Types.ObjectId;

  @Prop({ default: 0 })
  level?: number;

  @Prop({ enum: ['debit', 'credit'], default: 'debit' })
  normalBalance?: 'debit' | 'credit';

  // Decimal128 balance
  @Prop({ type: MSchema.Types.Decimal128, default: () => new MSchema.Types.Decimal128("0") })
  balance?: any;

  @Prop({ default: true })
  allowPosting?: boolean;

  @Prop({ type: String, default: 'USD' })
  currency?: string;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, string>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isSystemAccount?: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

// Indexes
AccountSchema.index({ code: 1 }, { unique: true });

// PRE-SAVE FIXED
AccountSchema.pre('save', async function (next) {
  const doc: any = this;

  try {
    // LEVEL
    if (doc.parent) {
      const parent = await (doc.constructor as any).findById(doc.parent).lean();
      doc.level = parent ? (parent.level ?? 0) + 1 : 1;
    } else {
      doc.level = 0;
    }

    // BALANCE DECIMAL128
    if (doc.balance != null) {
      try {
        doc.balance = new MSchema.Types.Decimal128(String(doc.balance));
      } catch (e) {
        console.error("Decimal128 conversion error:", e);
      }
    }

    next();
  } catch (err) {
    next(err as any);
  }
});

// Method for numeric balance
AccountSchema.method('getBalanceNumber', function () {
  const v = this.balance;
  try {
    if (!v) return 0;
    if (v.toString) return Number(v.toString());
    return Number(v);
  } catch {
    return 0;
  }
});
