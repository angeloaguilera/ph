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
exports.VatRuleSchema = exports.VatRule = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let VatRule = class VatRule {
};
exports.VatRule = VatRule;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], VatRule.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VatRule.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], VatRule.prototype, "rate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'sale' }),
    __metadata("design:type", String)
], VatRule.prototype, "appliesTo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], VatRule.prototype, "isRetention", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], VatRule.prototype, "isPerception", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'default' }),
    __metadata("design:type", String)
], VatRule.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Map, of: String }),
    __metadata("design:type", Map)
], VatRule.prototype, "metadata", void 0);
exports.VatRule = VatRule = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VatRule);
exports.VatRuleSchema = mongoose_1.SchemaFactory.createForClass(VatRule);
