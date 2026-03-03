import { Module } from '@nestjs/common';
import { FiscalPeriodService } from './fiscal-period.service';


@Module({
providers: [FiscalPeriodService],
exports: [FiscalPeriodService],
})
export class FiscalPeriodModule {}