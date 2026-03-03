import { PartialType } from '@nestjs/mapped-types';
import { CreateCashFlowTransactionDto } from './create-cash-transaction.dto';

export class UpdateCashFlowTransactionDto extends PartialType(CreateCashFlowTransactionDto) {}
