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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalEntryInput = exports.JournalLineInput = exports.JournalEntryObjectType = exports.JournalLineObjectType = void 0;
const graphql_1 = require("@nestjs/graphql");
const graphql_type_json_1 = require("graphql-type-json");
let JournalLineObjectType = class JournalLineObjectType {
};
exports.JournalLineObjectType = JournalLineObjectType;
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], JournalLineObjectType.prototype, "account", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalLineObjectType.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], JournalLineObjectType.prototype, "debit", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], JournalLineObjectType.prototype, "credit", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalLineObjectType.prototype, "taxCode", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalLineObjectType.prototype, "taxAmount", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalLineObjectType.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalLineObjectType.prototype, "exchangeRate", void 0);
exports.JournalLineObjectType = JournalLineObjectType = __decorate([
    (0, graphql_1.ObjectType)()
], JournalLineObjectType);
let JournalEntryObjectType = class JournalEntryObjectType {
};
exports.JournalEntryObjectType = JournalEntryObjectType;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], JournalEntryObjectType.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], JournalEntryObjectType.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => [JournalLineObjectType]),
    __metadata("design:type", Array)
], JournalEntryObjectType.prototype, "lines", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date),
    __metadata("design:type", Date)
], JournalEntryObjectType.prototype, "date", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntryObjectType.prototype, "reference", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], JournalEntryObjectType.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], JournalEntryObjectType.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalEntryObjectType.prototype, "exchangeRate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], JournalEntryObjectType.prototype, "totalDebit", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], JournalEntryObjectType.prototype, "totalCredit", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], JournalEntryObjectType.prototype, "postedAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], JournalEntryObjectType.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], JournalEntryObjectType.prototype, "updatedAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntryObjectType.prototype, "reversalOf", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Boolean)
], JournalEntryObjectType.prototype, "isReversal", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntryObjectType.prototype, "fiscalPeriod", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalEntryObjectType.prototype, "fiscalYear", void 0);
exports.JournalEntryObjectType = JournalEntryObjectType = __decorate([
    (0, graphql_1.ObjectType)()
], JournalEntryObjectType);
let JournalLineInput = class JournalLineInput {
};
exports.JournalLineInput = JournalLineInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], JournalLineInput.prototype, "account", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalLineInput.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], JournalLineInput.prototype, "debit", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], JournalLineInput.prototype, "credit", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalLineInput.prototype, "taxCode", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalLineInput.prototype, "taxAmount", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalLineInput.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalLineInput.prototype, "exchangeRate", void 0);
exports.JournalLineInput = JournalLineInput = __decorate([
    (0, graphql_1.InputType)()
], JournalLineInput);
let JournalEntryInput = class JournalEntryInput {
};
exports.JournalEntryInput = JournalEntryInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], JournalEntryInput.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date),
    __metadata("design:type", Date)
], JournalEntryInput.prototype, "date", void 0);
__decorate([
    (0, graphql_1.Field)(() => [JournalLineInput]),
    __metadata("design:type", Array)
], JournalEntryInput.prototype, "lines", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntryInput.prototype, "reference", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntryInput.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalEntryInput.prototype, "exchangeRate", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_type_json_1.GraphQLJSONObject, { nullable: true }),
    __metadata("design:type", Object)
], JournalEntryInput.prototype, "metadata", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String], { nullable: true }),
    __metadata("design:type", Array)
], JournalEntryInput.prototype, "attachments", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], JournalEntryInput.prototype, "fiscalPeriod", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], JournalEntryInput.prototype, "fiscalYear", void 0);
exports.JournalEntryInput = JournalEntryInput = __decorate([
    (0, graphql_1.InputType)()
], JournalEntryInput);
