import { Body, Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CashFlowStatementService } from './cash-flow-statement.service';
import { GenerateCashFlowDto } from './dto/generate-cash-flow.dto';

@Controller('api/accounting/cash-flow-statement')
export class CashFlowStatementController {
  constructor(private readonly svc: CashFlowStatementService) {}

  @Post('generate')
  @UsePipes(new ValidationPipe({ transform: true }))
  generate(@Body() dto: GenerateCashFlowDto, @Body('generatedBy') generatedBy?: string) {
    return this.svc.generate(dto, generatedBy);
  }

  @Get('report/:id')
  getReport(@Param('id') id: string) {
    return this.svc.getReport(id);
  }

  @Get('reports')
  listReports(@Query('limit') limit = '50', @Query('skip') skip = '0') {
    return this.svc.listReports(Number(limit), Number(skip));
  }
}
