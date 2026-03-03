import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  Query,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { CashFlowService } from './cash-flow.service';
import { CreateCashFlowTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashFlowTransactionDto } from './dto/update-cash-transaction.dto';
import { GenerateCashProjectionDto } from './dto/generate-projection.dto';

@Controller('api/accounting/cash-flow')
export class CashFlowController {
  constructor(private readonly svc: CashFlowService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() dto: CreateCashFlowTransactionDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll(@Query('limit') limit = '50', @Query('skip') skip = '0') {
    return this.svc.findAll({}, Number(limit), Number(skip));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Param('id') id: string, @Body() dto: UpdateCashFlowTransactionDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body('completedBy') completedBy?: string, @Body('createJournal') createJournal = true) {
    return this.svc.complete(id, completedBy, createJournal);
  }

  @Post(':id/reconcile')
  reconcile(@Param('id') id: string, @Body('reconciledAt') reconciledAt?: string) {
    return this.svc.reconcile(id, reconciledAt ? new Date(reconciledAt) : undefined);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }

  @Post('projection')
  @UsePipes(new ValidationPipe({ transform: true }))
  projection(@Body() dto: GenerateCashProjectionDto, @Body('generatedBy') generatedBy?: string) {
    return this.svc.generateProjection(dto, generatedBy);
  }
}
