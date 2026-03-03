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
exports.CreateAccountInput = exports.AccountObjectType = void 0;
const graphql_1 = require("@nestjs/graphql");
let AccountObjectType = class AccountObjectType {
};
exports.AccountObjectType = AccountObjectType;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", String)
], AccountObjectType.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AccountObjectType.prototype, "code", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AccountObjectType.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AccountObjectType.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], AccountObjectType.prototype, "parent", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], AccountObjectType.prototype, "level", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], AccountObjectType.prototype, "normalBalance", void 0);
__decorate([
    (0, graphql_1.Field)(() => String),
    __metadata("design:type", String)
], AccountObjectType.prototype, "balance", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", Boolean)
], AccountObjectType.prototype, "allowPosting", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], AccountObjectType.prototype, "currency", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Boolean)
], AccountObjectType.prototype, "isSystemAccount", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], AccountObjectType.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Date)
], AccountObjectType.prototype, "updatedAt", void 0);
exports.AccountObjectType = AccountObjectType = __decorate([
    (0, graphql_1.ObjectType)()
], AccountObjectType);
let CreateAccountInput = class CreateAccountInput {
};
exports.CreateAccountInput = CreateAccountInput;
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CreateAccountInput.prototype, "code", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CreateAccountInput.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(),
    __metadata("design:type", String)
], CreateAccountInput.prototype, "type", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], CreateAccountInput.prototype, "parent", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], CreateAccountInput.prototype, "normalBalance", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], CreateAccountInput.prototype, "balance", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Boolean)
], CreateAccountInput.prototype, "allowPosting", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], CreateAccountInput.prototype, "currency", void 0);
exports.CreateAccountInput = CreateAccountInput = __decorate([
    (0, graphql_1.InputType)()
], CreateAccountInput);
