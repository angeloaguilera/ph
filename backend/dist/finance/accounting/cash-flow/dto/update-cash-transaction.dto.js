"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateCashFlowTransactionDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_cash_transaction_dto_1 = require("./create-cash-transaction.dto");
class UpdateCashFlowTransactionDto extends (0, mapped_types_1.PartialType)(create_cash_transaction_dto_1.CreateCashFlowTransactionDto) {
}
exports.UpdateCashFlowTransactionDto = UpdateCashFlowTransactionDto;
