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
exports.ChartOfAccountsResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const chart_of_accounts_service_1 = require("./chart-of-accounts.service");
const account_graphql_1 = require("./graphql/account.graphql");
let ChartOfAccountsResolver = class ChartOfAccountsResolver {
    constructor(svc) {
        this.svc = svc;
    }
    findAll() {
        return this.svc.findAll();
    }
    accountTree() {
        return this.svc.getTree();
    }
    findOne(idOrCode) {
        return this.svc.findOne(idOrCode);
    }
    createAccount(input) {
        const dto = { ...input };
        return this.svc.create(dto);
    }
    updateAccount(id, input) {
        const dto = { ...input };
        return this.svc.update(id, dto);
    }
    deleteAccount(id) {
        return this.svc.remove(id).then(() => true);
    }
    adjustAccountBalance(id, amount) {
        return this.svc.adjustBalance(id, amount);
    }
};
exports.ChartOfAccountsResolver = ChartOfAccountsResolver;
__decorate([
    (0, graphql_1.Query)(() => [account_graphql_1.AccountObjectType], { name: 'accounts' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChartOfAccountsResolver.prototype, "findAll", null);
__decorate([
    (0, graphql_1.Query)(() => [account_graphql_1.AccountObjectType], { name: 'accountTree' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChartOfAccountsResolver.prototype, "accountTree", null);
__decorate([
    (0, graphql_1.Query)(() => account_graphql_1.AccountObjectType, { name: 'account' }),
    __param(0, (0, graphql_1.Args)('idOrCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChartOfAccountsResolver.prototype, "findOne", null);
__decorate([
    (0, graphql_1.Mutation)(() => account_graphql_1.AccountObjectType),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [account_graphql_1.CreateAccountInput]),
    __metadata("design:returntype", void 0)
], ChartOfAccountsResolver.prototype, "createAccount", null);
__decorate([
    (0, graphql_1.Mutation)(() => account_graphql_1.AccountObjectType),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, account_graphql_1.CreateAccountInput]),
    __metadata("design:returntype", void 0)
], ChartOfAccountsResolver.prototype, "updateAccount", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    __param(0, (0, graphql_1.Args)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChartOfAccountsResolver.prototype, "deleteAccount", null);
__decorate([
    (0, graphql_1.Mutation)(() => account_graphql_1.AccountObjectType),
    __param(0, (0, graphql_1.Args)('id')),
    __param(1, (0, graphql_1.Args)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], ChartOfAccountsResolver.prototype, "adjustAccountBalance", null);
exports.ChartOfAccountsResolver = ChartOfAccountsResolver = __decorate([
    (0, graphql_1.Resolver)(() => account_graphql_1.AccountObjectType),
    __metadata("design:paramtypes", [chart_of_accounts_service_1.ChartOfAccountsService])
], ChartOfAccountsResolver);
