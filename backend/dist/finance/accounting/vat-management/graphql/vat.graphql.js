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
exports.VatTransactionInput = exports.VatLineInput = exports.VatTransactionGQL = exports.VatLineGQL = void 0;
const graphql_1 = require("@nestjs/graphql");
let VatLineGQL = class VatLineGQL {
};
exports.VatLineGQL = VatLineGQL;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatLineGQL.prototype, "account", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], VatLineGQL.prototype, "baseAmount", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], VatLineGQL.prototype, "vatAmount", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], VatLineGQL.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], VatLineGQL.prototype, "vatRuleCode", void 0);
exports.VatLineGQL = VatLineGQL = __decorate([
    (0, graphql_1.ObjectType)()
], VatLineGQL);
let VatTransactionGQL = class VatTransactionGQL {
};
exports.VatTransactionGQL = VatTransactionGQL;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], VatTransactionGQL.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatTransactionGQL.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatTransactionGQL.prototype, "date", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatTransactionGQL.prototype, "reference", void 0);
__decorate([
    (0, graphql_1.Field)(() => [VatLineGQL]),
    __metadata("design:type", Array)
], VatTransactionGQL.prototype, "lines", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], VatTransactionGQL.prototype, "totalBase", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], VatTransactionGQL.prototype, "totalVat", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], VatTransactionGQL.prototype, "status", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], VatTransactionGQL.prototype, "journalEntryRef", void 0);
exports.VatTransactionGQL = VatTransactionGQL = __decorate([
    (0, graphql_1.ObjectType)()
], VatTransactionGQL);
let VatLineInput = class VatLineInput {
};
exports.VatLineInput = VatLineInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatLineInput.prototype, "account", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], VatLineInput.prototype, "baseAmount", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], VatLineInput.prototype, "vatRuleCode", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], VatLineInput.prototype, "description", void 0);
exports.VatLineInput = VatLineInput = __decorate([
    (0, graphql_1.InputType)()
], VatLineInput);
let VatTransactionInput = class VatTransactionInput {
};
exports.VatTransactionInput = VatTransactionInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatTransactionInput.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatTransactionInput.prototype, "date", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], VatTransactionInput.prototype, "reference", void 0);
__decorate([
    (0, graphql_1.Field)(() => [VatLineInput]),
    __metadata("design:type", Array)
], VatTransactionInput.prototype, "lines", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], VatTransactionInput.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], VatTransactionInput.prototype, "exchangeRate", void 0);
exports.VatTransactionInput = VatTransactionInput = __decorate([
    (0, graphql_1.InputType)()
], VatTransactionInput);
