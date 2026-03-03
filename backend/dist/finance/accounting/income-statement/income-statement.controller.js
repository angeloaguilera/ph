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
exports.IncomeStatementController = void 0;
const common_1 = require("@nestjs/common");
const income_statement_service_1 = require("./income-statement.service");
const generate_income_statement_dto_1 = require("./dto/generate-income-statement.dto");
let IncomeStatementController = class IncomeStatementController {
    constructor(svc) {
        this.svc = svc;
    }
    generate(dto, generatedBy) {
        return this.svc.generate(dto, generatedBy);
    }
    getReport(id) {
        return this.svc.getReport(id);
    }
    listReports(limit = '50', skip = '0') {
        return this.svc.listReports(Number(limit), Number(skip));
    }
};
exports.IncomeStatementController = IncomeStatementController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Body)('generatedBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_income_statement_dto_1.GenerateIncomeStatementDto, String]),
    __metadata("design:returntype", void 0)
], IncomeStatementController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('report/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IncomeStatementController.prototype, "getReport", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], IncomeStatementController.prototype, "listReports", null);
exports.IncomeStatementController = IncomeStatementController = __decorate([
    (0, common_1.Controller)('api/accounting/income-statement'),
    __metadata("design:paramtypes", [income_statement_service_1.IncomeStatementService])
], IncomeStatementController);
