"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedAccountingModule = void 0;
const common_1 = require("@nestjs/common");
const currency_service_1 = require("./services/currency.service");
const rounding_service_1 = require("./services/rounding.service");
const event_bus_service_1 = require("../events/event-bus.service");
let SharedAccountingModule = class SharedAccountingModule {
};
exports.SharedAccountingModule = SharedAccountingModule;
exports.SharedAccountingModule = SharedAccountingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [currency_service_1.CurrencyService, rounding_service_1.RoundingService, event_bus_service_1.EventBusService],
        exports: [currency_service_1.CurrencyService, rounding_service_1.RoundingService, event_bus_service_1.EventBusService],
    })
], SharedAccountingModule);
