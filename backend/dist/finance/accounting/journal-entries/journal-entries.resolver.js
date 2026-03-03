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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEntriesResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const journal_entries_service_1 = require("./journal-entries.service");
const journal_entry_graphql_1 = require("./graphql/journal-entry.graphql");
const parse_objectid_pipe_1 = require("../../../common/pipes/parse-objectid.pipe");
let JournalEntriesResolver = class JournalEntriesResolver {
    constructor(svc) {
        this.svc = svc;
    }
    async findAll(limit = 50, skip = 0) {
        return this.svc.findAll({}, limit, skip);
    }
    async findOne(id) {
        return this.svc.findOne(id);
    }
    async createJournalEntry(input) {
        // convert input -> DTO shape
        const dto = {
            ...input,
            date: input.date,
            lines: input.lines,
            currency: input.currency,
            exchangeRate: input.exchangeRate,
            description: input.description,
            reference: input.reference,
            metadata: input.metadata,
            attachments: input.attachments,
            fiscalPeriod: input.fiscalPeriod,
            fiscalYear: input.fiscalYear,
        };
        return this.svc.create(dto);
    }
    async updateJournalEntry(id, input) {
        const dto = { ...input };
        return this.svc.update(id, dto);
    }
    async deleteJournalEntry(id) {
        await this.svc.remove(id);
        return true;
    }
    async postJournalEntry(id, postedBy) {
        return this.svc.post(id, postedBy);
    }
    async unpostJournalEntry(id) {
        return this.svc.unpost(id);
    }
    async reverseJournalEntry(id, reason, reversedBy) {
        return this.svc.reverse(id, reason, reversedBy);
    }
};
exports.JournalEntriesResolver = JournalEntriesResolver;
__decorate([
    (0, graphql_1.Query)(() => [journal_entry_graphql_1.JournalEntryObjectType], { name: 'journalEntries' }),
    __param(0, (0, graphql_1.Args)('limit', { type: () => Number, nullable: true })),
    __param(1, (0, graphql_1.Args)('skip', { type: () => Number, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "findAll", null);
__decorate([
    (0, graphql_1.Query)(() => journal_entry_graphql_1.JournalEntryObjectType, { name: 'journalEntry' }),
    __param(0, (0, graphql_1.Args)('id', { type: () => String }, parse_objectid_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "findOne", null);
__decorate([
    (0, graphql_1.Mutation)(() => journal_entry_graphql_1.JournalEntryObjectType),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [journal_entry_graphql_1.JournalEntryInput]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "createJournalEntry", null);
__decorate([
    (0, graphql_1.Mutation)(() => journal_entry_graphql_1.JournalEntryObjectType),
    __param(0, (0, graphql_1.Args)('id', { type: () => String }, parse_objectid_pipe_1.ParseObjectIdPipe)),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, journal_entry_graphql_1.JournalEntryInput]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "updateJournalEntry", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('id', { type: () => String }, parse_objectid_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "deleteJournalEntry", null);
__decorate([
    (0, graphql_1.Mutation)(() => journal_entry_graphql_1.JournalEntryObjectType),
    __param(0, (0, graphql_1.Args)('id', { type: () => String }, parse_objectid_pipe_1.ParseObjectIdPipe)),
    __param(1, (0, graphql_1.Args)('postedBy', { type: () => String, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "postJournalEntry", null);
__decorate([
    (0, graphql_1.Mutation)(() => journal_entry_graphql_1.JournalEntryObjectType),
    __param(0, (0, graphql_1.Args)('id', { type: () => String }, parse_objectid_pipe_1.ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "unpostJournalEntry", null);
__decorate([
    (0, graphql_1.Mutation)(() => journal_entry_graphql_1.JournalEntryObjectType),
    __param(0, (0, graphql_1.Args)('id', { type: () => String }, parse_objectid_pipe_1.ParseObjectIdPipe)),
    __param(1, (0, graphql_1.Args)('reason', { type: () => String, nullable: true })),
    __param(2, (0, graphql_1.Args)('reversedBy', { type: () => String, nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], JournalEntriesResolver.prototype, "reverseJournalEntry", null);
exports.JournalEntriesResolver = JournalEntriesResolver = __decorate([
    (0, graphql_1.Resolver)(() => journal_entry_graphql_1.JournalEntryObjectType),
    __metadata("design:paramtypes", [journal_entries_service_1.JournalEntriesService])
], JournalEntriesResolver);
