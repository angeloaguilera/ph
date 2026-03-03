import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BalanceSheetReport, BalanceSheetReportSchema } from '../balance-sheet/schemas/balance-sheet-report.schema';
import { ReportRepositoryService } from './report-repository.service';


@Module({
imports: [MongooseModule.forFeature([{ name: BalanceSheetReport.name, schema: BalanceSheetReportSchema }])],
providers: [ReportRepositoryService],
exports: [ReportRepositoryService],
})
export class ReportRepositoryModule {}