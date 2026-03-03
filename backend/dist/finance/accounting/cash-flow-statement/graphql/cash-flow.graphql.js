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
exports.GenerateCashFlowInput = exports.CashFlowResultGQL = exports.CashFlowResultLineGQL = void 0;
const graphql_1 = require("@nestjs/graphql");
let CashFlowResultLineGQL = class CashFlowResultLineGQL {
};
exports.CashFlowResultLineGQL = CashFlowResultLineGQL;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], CashFlowResultLineGQL.prototype, "operating", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], CashFlowResultLineGQL.prototype, "investing", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], CashFlowResultLineGQL.prototype, "financing", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], CashFlowResultLineGQL.prototype, "totalCashChange", void 0);
exports.CashFlowResultLineGQL = CashFlowResultLineGQL = __decorate([
    (0, graphql_1.ObjectType)()
], CashFlowResultLineGQL);
let CashFlowResultGQL = class CashFlowResultGQL {
};
exports.CashFlowResultGQL = CashFlowResultGQL;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CashFlowResultGQL.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CashFlowResultGQL.prototype, "endDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CashFlowResultGQL.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CashFlowResultGQL.prototype, "method", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], CashFlowResultGQL.prototype, "operating", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], CashFlowResultGQL.prototype, "investing", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], CashFlowResultGQL.prototype, "financing", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], CashFlowResultGQL.prototype, "totalCashChange", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Object)
], CashFlowResultGQL.prototype, "indirect", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CashFlowResultGQL.prototype, "generatedAt", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Number)
], CashFlowResultGQL.prototype, "numEntriesConsidered", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String]),
    __metadata("design:type", Array)
], CashFlowResultGQL.prototype, "detectedCashAccounts", void 0);
exports.CashFlowResultGQL = CashFlowResultGQL = __decorate([
    (0, graphql_1.ObjectType)()
], CashFlowResultGQL);
let GenerateCashFlowInput = class GenerateCashFlowInput {
};
exports.GenerateCashFlowInput = GenerateCashFlowInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], GenerateCashFlowInput.prototype, "startDate", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], GenerateCashFlowInput.prototype, "endDate", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], GenerateCashFlowInput.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], GenerateCashFlowInput.prototype, "method", void 0);
__decorate([
    (0, graphql_1.Field)(() => [String], { nullable: true }),
    __metadata("design:type", Array)
], GenerateCashFlowInput.prototype, "cashAccountIds", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Boolean)
], GenerateCashFlowInput.prototype, "saveReport", void 0);
exports.GenerateCashFlowInput = GenerateCashFlowInput = __decorate([
    (0, graphql_1.InputType)()
], GenerateCashFlowInput);
