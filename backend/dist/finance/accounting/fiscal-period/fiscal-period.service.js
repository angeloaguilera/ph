"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiscalPeriodService = void 0;
const common_1 = require("@nestjs/common");
let FiscalPeriodService = class FiscalPeriodService {
    constructor() {
        this.periods = [];
    }
    createPeriod(start, end, name) {
        if (end < start)
            throw new common_1.BadRequestException('end < start');
        const p = { id: String(Date.now()), start, end, closed: false, name };
        this.periods.push(p);
        return p;
    }
    list() {
        return this.periods.slice().sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    close(id) {
        const p = this.periods.find(x => x.id === id);
        if (!p)
            throw new common_1.BadRequestException('period not found');
        p.closed = true;
        return p;
    }
};
exports.FiscalPeriodService = FiscalPeriodService;
exports.FiscalPeriodService = FiscalPeriodService = __decorate([
    (0, common_1.Injectable)()
], FiscalPeriodService);
