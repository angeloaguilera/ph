"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccountsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const chart_of_accounts_service_1 = require("./chart-of-accounts.service");
const chart_of_accounts_controller_1 = require("./chart-of-accounts.controller");
const chart_of_accounts_resolver_1 = require("./chart-of-accounts.resolver");
const account_schema_1 = require("./schemas/account.schema");
let ChartOfAccountsModule = class ChartOfAccountsModule {
};
exports.ChartOfAccountsModule = ChartOfAccountsModule;
exports.ChartOfAccountsModule = ChartOfAccountsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: account_schema_1.Account.name, schema: account_schema_1.AccountSchema }]),
        ],
        providers: [chart_of_accounts_service_1.ChartOfAccountsService, chart_of_accounts_resolver_1.ChartOfAccountsResolver],
        controllers: [chart_of_accounts_controller_1.ChartOfAccountsController],
        exports: [chart_of_accounts_service_1.ChartOfAccountsService],
    })
], ChartOfAccountsModule);
