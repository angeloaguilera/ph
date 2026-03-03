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
exports.JournalEntriesController = void 0;
const common_1 = require("@nestjs/common");
const journal_entries_service_1 = require("./journal-entries.service");
const create_journal_entry_dto_1 = require("./dto/create-journal-entry.dto");
const update_journal_entry_dto_1 = require("./dto/update-journal-entry.dto");
let JournalEntriesController = class JournalEntriesController {
    constructor(svc) {
        this.svc = svc;
    }
    create(dto) {
        return this.svc.create(dto);
    }
    findAll(limit = '50', skip = '0') {
        return this.svc.findAll({}, Number(limit), Number(skip));
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    update(id, dto) {
        return this.svc.update(id, dto);
    }
    remove(id) {
        return this.svc.remove(id);
    }
    post(id, postedBy) {
        return this.svc.post(id, postedBy);
    }
    unpost(id) {
        return this.svc.unpost(id);
    }
    reverse(id, reason, reversedBy) {
        return this.svc.reverse(id, reason, reversedBy);
    }
};
exports.JournalEntriesController = JournalEntriesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_journal_entry_dto_1.CreateJournalEntryDto]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_journal_entry_dto_1.UpdateJournalEntryDto]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/post'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('postedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "post", null);
__decorate([
    (0, common_1.Post)(':id/unpost'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "unpost", null);
__decorate([
    (0, common_1.Post)(':id/reverse'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Body)('reversedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], JournalEntriesController.prototype, "reverse", null);
exports.JournalEntriesController = JournalEntriesController = __decorate([
    (0, common_1.Controller)('api/accounting/journal-entries'),
    __metadata("design:paramtypes", [journal_entries_service_1.JournalEntriesService])
], JournalEntriesController);
