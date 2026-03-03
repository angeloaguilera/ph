import { Global, Module } from '@nestjs/common';
import { CurrencyService } from './services/currency.service';
import { RoundingService } from './services/rounding.service';
import { EventBusService } from '../events/event-bus.service';


@Global()
@Module({
providers: [CurrencyService, RoundingService, EventBusService],
exports: [CurrencyService, RoundingService, EventBusService],
})
export class SharedAccountingModule {}