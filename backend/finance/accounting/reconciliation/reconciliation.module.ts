import { Module } from '@nestjs/common';
import { ReconciliationEngineService } from './reconciliation-engine.service';
import { EventBusService } from '../events/event-bus.service';


@Module({
providers: [ReconciliationEngineService, EventBusService],
exports: [ReconciliationEngineService],
})
export class ReconciliationModule {}