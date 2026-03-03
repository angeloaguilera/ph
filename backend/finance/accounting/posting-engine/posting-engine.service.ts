import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JournalEntry, JournalEntryDocument } from '../journal-entries/schemas/journal-entry.schema';
import { EventBusService } from '../events/event-bus.service';


@Injectable()
export class PostingEngineService {
private readonly logger = new Logger(PostingEngineService.name);


constructor(
@InjectModel(JournalEntry.name) private journalModel: Model<JournalEntryDocument>,
private eventBus: EventBusService,
) {}


// Validate lines and post a journal entry atomically
async postJournal(payload: {
description?: string;
date: Date;
lines: { account: string | Types.ObjectId; debit?: number; credit?: number; description?: string }[];
currency?: string;
exchangeRate?: number;
source?: string;
metadata?: Record<string, any>;
createdBy?: string;
}) {
if (!payload.lines || payload.lines.length === 0) throw new BadRequestException('Journal must have at least one line');


// compute totals
let totalDebit = 0;
let totalCredit = 0;
for (const l of payload.lines) {
totalDebit += Number(l.debit || 0);
totalCredit += Number(l.credit || 0);
}


const eps = 0.000001;
if (Math.abs(totalDebit - totalCredit) > eps) {
throw new BadRequestException('Journal entry not balanced');
}


const je = new this.journalModel({
description: payload.description,
date: payload.date,
lines: payload.lines.map(l => ({ account: l.account, debit: l.debit || 0, credit: l.credit || 0, description: l.description })),
status: 'posted',
currency: payload.currency || 'USD',
exchangeRate: payload.exchangeRate || 1,
totalDebit,
totalCredit,
postedAt: new Date(),
source: payload.source || 'posting-engine',
metadata: payload.metadata,
createdBy: payload.createdBy ? new Types.ObjectId(payload.createdBy) : undefined,
} as any);


const saved = await je.save();


// publish event
try {
this.eventBus.emit('JOURNAL_ENTRY_POSTED', saved);
} catch (e) {
this.logger.warn('Event bus emit failed: ' + String(e));
}


return saved;
}
}