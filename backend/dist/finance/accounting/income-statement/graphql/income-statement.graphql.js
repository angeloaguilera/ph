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
exports.GenerateIncomeStatementInput = exports.IncomeStatementResultGQL = exports.IncomeLineGQL = void 0;
const graphql_1 = require("@nestjs/graphql");
let IncomeLineGQL = class IncomeLineGQL {
};
exports.IncomeLineGQL = IncomeLineGQL;
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], IncomeLineGQL.prototype, "accountId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], IncomeLineGQL.prototype, "code", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], IncomeLineGQL.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], IncomeLineGQL.prototype, "amount", void 0);
exports.IncomeLineGQL = IncomeLineGQL = __decorate([
    (0, graphql_1.ObjectType)()
], IncomeLineGQL);
let IncomeStatementResultGQL = class IncomeStatementResultGQL {
};
exports.IncomeStatementResultGQL = IncomeStatementResultGQL;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], IncomeStatementResultGQL.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], IncomeStatementResultGQL.prototype, "endDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], IncomeStatementResultGQL.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], IncomeStatementResultGQL.prototype, "groupBy", void 0);
__decorate([
    (0, graphql_1.Field)(() => [IncomeLineGQL]),
    __metadata("design:type", Array)
], IncomeStatementResultGQL.prototype, "revenues", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], IncomeStatementResultGQL.prototype, "totalRevenue", void 0);
__decorate([
    (0, graphql_1.Field)(() => [IncomeLineGQL]),
    __metadata("design:type", Array)
], IncomeStatementResultGQL.prototype, "expenses", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], IncomeStatementResultGQL.prototype, "totalExpenses", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], IncomeStatementResultGQL.prototype, "netIncome", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], IncomeStatementResultGQL.prototype, "generatedAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], IncomeStatementResultGQL.prototype, "numEntriesConsidered", void 0);
exports.IncomeStatementResultGQL = IncomeStatementResultGQL = __decorate([
    (0, graphql_1.ObjectType)()
], IncomeStatementResultGQL);
let GenerateIncomeStatementInput = class GenerateIncomeStatementInput {
};
exports.GenerateIncomeStatementInput = GenerateIncomeStatementInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], GenerateIncomeStatementInput.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], GenerateIncomeStatementInput.prototype, "endDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], GenerateIncomeStatementInput.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], GenerateIncomeStatementInput.prototype, "groupBy", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Boolean)
], GenerateIncomeStatementInput.prototype, "saveReport", void 0);
exports.GenerateIncomeStatementInput = GenerateIncomeStatementInput = __decorate([
    (0, graphql_1.InputType)()
], GenerateIncomeStatementInput);
