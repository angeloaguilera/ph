"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReconciliationEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationEngineService = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../events/event-bus.service");
let ReconciliationEngineService = ReconciliationEngineService_1 = class ReconciliationEngineService {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(ReconciliationEngineService_1.name);
        // subscribe to journal posted events
        this.eventBus.on('JOURNAL_ENTRY_POSTED', (je) => this.onJournalPosted(je));
    }
    async onJournalPosted(je) {
        // Example: automatically mark bank transactions, or flag recon differences
        this.logger.debug('ReconciliationEngine: received JE posted ' + String(je._id));
        // implement domain-specific matching here
    }
};
exports.ReconciliationEngineService = ReconciliationEngineService;
exports.ReconciliationEngineService = ReconciliationEngineService = ReconciliationEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], ReconciliationEngineService);
