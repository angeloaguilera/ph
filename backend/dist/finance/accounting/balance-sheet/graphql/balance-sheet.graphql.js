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
exports.GenerateBalanceSheetInput = exports.BalanceSheetResultGQL = exports.BalanceAccountGQL = void 0;
const graphql_1 = require("@nestjs/graphql");
let BalanceAccountGQL = class BalanceAccountGQL {
};
exports.BalanceAccountGQL = BalanceAccountGQL;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BalanceAccountGQL.prototype, "accountId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BalanceAccountGQL.prototype, "code", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BalanceAccountGQL.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BalanceAccountGQL.prototype, "amount", void 0);
exports.BalanceAccountGQL = BalanceAccountGQL = __decorate([
    (0, graphql_1.ObjectType)()
], BalanceAccountGQL);
let BalanceSheetResultGQL = class BalanceSheetResultGQL {
};
exports.BalanceSheetResultGQL = BalanceSheetResultGQL;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BalanceSheetResultGQL.prototype, "snapshotDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BalanceSheetResultGQL.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)(() => [BalanceAccountGQL]),
    __metadata("design:type", Array)
], BalanceSheetResultGQL.prototype, "assets", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BalanceSheetResultGQL.prototype, "totalAssets", void 0);
__decorate([
    (0, graphql_1.Field)(() => [BalanceAccountGQL]),
    __metadata("design:type", Array)
], BalanceSheetResultGQL.prototype, "liabilities", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BalanceSheetResultGQL.prototype, "totalLiabilities", void 0);
__decorate([
    (0, graphql_1.Field)(() => [BalanceAccountGQL]),
    __metadata("design:type", Array)
], BalanceSheetResultGQL.prototype, "equity", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BalanceSheetResultGQL.prototype, "totalEquity", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BalanceSheetResultGQL.prototype, "liabilitiesPlusEquity", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BalanceSheetResultGQL.prototype, "difference", void 0);
exports.BalanceSheetResultGQL = BalanceSheetResultGQL = __decorate([
    (0, graphql_1.ObjectType)()
], BalanceSheetResultGQL);
let GenerateBalanceSheetInput = class GenerateBalanceSheetInput {
};
exports.GenerateBalanceSheetInput = GenerateBalanceSheetInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], GenerateBalanceSheetInput.prototype, "snapshotDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], GenerateBalanceSheetInput.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], GenerateBalanceSheetInput.prototype, "groupBy", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Boolean)
], GenerateBalanceSheetInput.prototype, "saveReport", void 0);
exports.GenerateBalanceSheetInput = GenerateBalanceSheetInput = __decorate([
    (0, graphql_1.InputType)()
], GenerateBalanceSheetInput);
