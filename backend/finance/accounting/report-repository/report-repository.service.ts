import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BalanceSheetReport, BalanceSheetReportDocument } from '../balance-sheet/schemas/balance-sheet-report.schema';


@Injectable()
export class ReportRepositoryService {
constructor(@InjectModel(BalanceSheetReport.name) private reportModel: Model<BalanceSheetReportDocument>) {}


async save(type: string, meta: any, payload: any) {
const doc = new this.reportModel({ snapshotDate: new Date(), currency: meta.currency || 'USD', result: payload, metadata: meta });
return doc.save();
}


async list(limit = 50, skip = 0) {
return this.reportModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
}
}