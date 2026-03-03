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
exports.IncomeStatementReportSchema = exports.IncomeStatementReport = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let IncomeStatementReport = class IncomeStatementReport {
};
exports.IncomeStatementReport = IncomeStatementReport;
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], IncomeStatementReport.prototype, "startDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date, required: true }),
    __metadata("design:type", Date)
], IncomeStatementReport.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'USD' }),
    __metadata("design:type", String)
], IncomeStatementReport.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], IncomeStatementReport.prototype, "result", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: false }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], IncomeStatementReport.prototype, "generatedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], IncomeStatementReport.prototype, "metadata", void 0);
exports.IncomeStatementReport = IncomeStatementReport = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], IncomeStatementReport);
exports.IncomeStatementReportSchema = mongoose_1.SchemaFactory.createForClass(IncomeStatementReport);
