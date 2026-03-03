"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEntriesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const journal_entries_service_1 = require("./journal-entries.service");
const journal_entries_controller_1 = require("./journal-entries.controller");
const journal_entries_resolver_1 = require("./journal-entries.resolver");
const journal_entry_schema_1 = require("./schemas/journal-entry.schema");
let JournalEntriesModule = class JournalEntriesModule {
};
exports.JournalEntriesModule = JournalEntriesModule;
exports.JournalEntriesModule = JournalEntriesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: journal_entry_schema_1.JournalEntry.name, schema: journal_entry_schema_1.JournalEntrySchema },
                // If you have Account schema in another module you can import it there or reference by name.
                // { name: 'Account', schema: AccountSchema }
            ]),
        ],
        providers: [journal_entries_service_1.JournalEntriesService, journal_entries_resolver_1.JournalEntriesResolver],
        controllers: [journal_entries_controller_1.JournalEntriesController],
        exports: [journal_entries_service_1.JournalEntriesService],
    })
], JournalEntriesModule);
