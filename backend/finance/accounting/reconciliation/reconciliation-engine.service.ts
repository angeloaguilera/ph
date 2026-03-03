import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../events/event-bus.service';


@Injectable()
export class ReconciliationEngineService {
private readonly logger = new Logger(ReconciliationEngineService.name);
constructor(private eventBus: EventBusService) {
// subscribe to journal posted events
this.eventBus.on('JOURNAL_ENTRY_POSTED', (je) => this.onJournalPosted(je));
}


private async onJournalPosted(je: any) {
// Example: automatically mark bank transactions, or flag recon differences
this.logger.debug('ReconciliationEngine: received JE posted ' + String(je._id));
// implement domain-specific matching here
}
}