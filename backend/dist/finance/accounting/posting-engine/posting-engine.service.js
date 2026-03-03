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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PostingEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostingEngineService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const journal_entry_schema_1 = require("../journal-entries/schemas/journal-entry.schema");
const event_bus_service_1 = require("../events/event-bus.service");
let PostingEngineService = PostingEngineService_1 = class PostingEngineService {
    constructor(journalModel, eventBus) {
        this.journalModel = journalModel;
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(PostingEngineService_1.name);
    }
    // Validate lines and post a journal entry atomically
    async postJournal(payload) {
        if (!payload.lines || payload.lines.length === 0)
            throw new common_1.BadRequestException('Journal must have at least one line');
        // compute totals
        let totalDebit = 0;
        let totalCredit = 0;
        for (const l of payload.lines) {
            totalDebit += Number(l.debit || 0);
            totalCredit += Number(l.credit || 0);
        }
        const eps = 0.000001;
        if (Math.abs(totalDebit - totalCredit) > eps) {
            throw new common_1.BadRequestException('Journal entry not balanced');
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
            createdBy: payload.createdBy ? new mongoose_2.Types.ObjectId(payload.createdBy) : undefined,
        });
        const saved = await je.save();
        // publish event
        try {
            this.eventBus.emit('JOURNAL_ENTRY_POSTED', saved);
        }
        catch (e) {
            this.logger.warn('Event bus emit failed: ' + String(e));
        }
        return saved;
    }
};
exports.PostingEngineService = PostingEngineService;
exports.PostingEngineService = PostingEngineService = PostingEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(journal_entry_schema_1.JournalEntry.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        event_bus_service_1.EventBusService])
], PostingEngineService);
