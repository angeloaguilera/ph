import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument, AccountType } from './schemas/account.schema';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class ChartOfAccountsService {
  constructor(@InjectModel(Account.name) private accountModel: Model<AccountDocument>) {}

  // Create account
  async create(dto: CreateAccountDto) {
    // Normalize code
    const code = dto.code.trim();
    const exists = await this.accountModel.findOne({ code }).lean();
    if (exists) throw new BadRequestException('Account code already exists.');

    const toCreate: Partial<Account> = {
      code,
      name: dto.name,
      type: dto.type,
      parent: dto.parent ? new Types.ObjectId(dto.parent) : undefined,
      normalBalance: dto.normalBalance ?? this.defaultNormalBalance(dto.type),
      allowPosting: dto.allowPosting ?? true,
      currency: dto.currency ?? 'USD',
      balance: dto.balance ?? 0,
    };

    const created = new this.accountModel(toCreate);
    return created.save();
  }

  // Default normal balance by type
  private defaultNormalBalance(type: AccountType) {
    if (type === AccountType.ASSET || type === AccountType.EXPENSE) return 'debit';
    return 'credit';
  }

  // Find all (with optional filters)
  async findAll() {
    return this.accountModel.find().sort({ code: 1 }).lean();
  }

  // Find one
  async findOne(idOrCode: string) {
    if (Types.ObjectId.isValid(idOrCode)) {
      const doc = await this.accountModel.findById(idOrCode);
      if (!doc) throw new NotFoundException('Account not found');
      return doc;
    }
    // otherwise search by code
    const doc = await this.accountModel.findOne({ code: idOrCode });
    if (!doc) throw new NotFoundException('Account not found by code');
    return doc;
  }

  // Update
  async update(id: string, dto: UpdateAccountDto) {
    const doc = await this.findOne(id);
    if (doc.isSystemAccount) throw new BadRequestException('System account cannot be updated.');

    if (dto.code && dto.code !== doc.code) {
      const exists = await this.accountModel.findOne({ code: dto.code });
      if (exists) throw new BadRequestException('Another account with that code already exists.');
    }

    // If balance is provided, convert to Decimal128 on save (schema pre-hook will handle)
    const updated = await this.accountModel.findByIdAndUpdate(doc._id, { $set: dto }, { new: true });
    return updated;
  }

  // Remove (only if no children and not system)
  async remove(id: string) {
    const doc = await this.findOne(id);
    if (doc.isSystemAccount) throw new BadRequestException('Cannot delete system account.');

    const children = await this.accountModel.findOne({ parent: doc._id }).lean();
    if (children) throw new BadRequestException('Cannot delete account with child accounts.');

    await this.accountModel.findByIdAndDelete(doc._id);
    return { deleted: true };
  }

  // Get tree (nested) - useful for UI
  async getTree() {
    const accounts = await this.findAll();
    const map = new Map<string, any>();
    accounts.forEach(a => {
      map.set(String(a._id), { ...a, children: [] });
    });
    const roots: any[] = [];
    for (const a of accounts) {
      if (a.parent) {
        const p = map.get(String(a.parent));
        if (p) p.children.push(map.get(String(a._id)));
        else roots.push(map.get(String(a._id))); // orphaned
      } else {
        roots.push(map.get(String(a._id)));
      }
    }
    return roots;
  }

  // Find by code quick
  async findByCode(code: string) {
    return this.accountModel.findOne({ code }).lean();
  }

  // Adjust balance (atomic): amount in major units, sign depends on normalBalance
  async adjustBalance(accountId: string, amount: number) {
    if (!Types.ObjectId.isValid(accountId)) throw new BadRequestException('Invalid account id');
    // amount can be positive or negative
    const res = await this.accountModel.findByIdAndUpdate(
      accountId,
      // Using $inc is tricky with Decimal128; Mongoose supports incrementing Decimal128 if value is Decimal128
      // We'll convert to Decimal128 string.
      { $inc: { balance: amount } } as any,
      { new: true },
    );
    return res;
  }
}
