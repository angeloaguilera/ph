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
exports.AutoMatchInput = exports.BankStatementGQL = exports.BankStatementLineGQL = void 0;
const graphql_1 = require("@nestjs/graphql");
let BankStatementLineGQL = class BankStatementLineGQL {
};
exports.BankStatementLineGQL = BankStatementLineGQL;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], BankStatementLineGQL.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BankStatementLineGQL.prototype, "date", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    __metadata("design:type", Number)
], BankStatementLineGQL.prototype, "amount", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], BankStatementLineGQL.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], BankStatementLineGQL.prototype, "transactionId", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Boolean)
], BankStatementLineGQL.prototype, "matched", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], BankStatementLineGQL.prototype, "matchedJournalEntry", void 0);
exports.BankStatementLineGQL = BankStatementLineGQL = __decorate([
    (0, graphql_1.ObjectType)()
], BankStatementLineGQL);
let BankStatementGQL = class BankStatementGQL {
};
exports.BankStatementGQL = BankStatementGQL;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], BankStatementGQL.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BankStatementGQL.prototype, "accountName", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BankStatementGQL.prototype, "bankAccountId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BankStatementGQL.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], BankStatementGQL.prototype, "statementDate", void 0);
__decorate([
    (0, graphql_1.Field)(() => [BankStatementLineGQL]),
    __metadata("design:type", Array)
], BankStatementGQL.prototype, "lines", void 0);
exports.BankStatementGQL = BankStatementGQL = __decorate([
    (0, graphql_1.ObjectType)()
], BankStatementGQL);
let AutoMatchInput = class AutoMatchInput {
};
exports.AutoMatchInput = AutoMatchInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AutoMatchInput.prototype, "statementId", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], AutoMatchInput.prototype, "toleranceDays", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], AutoMatchInput.prototype, "toleranceAmount", void 0);
exports.AutoMatchInput = AutoMatchInput = __decorate([
    (0, graphql_1.InputType)()
], AutoMatchInput);
