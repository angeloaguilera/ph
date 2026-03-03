import { Body, Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { IncomeStatementService } from './income-statement.service';
import { GenerateIncomeStatementDto } from './dto/generate-income-statement.dto';

@Controller('api/accounting/income-statement')
export class IncomeStatementController {
  constructor(private readonly svc: IncomeStatementService) {}

  @Post('generate')
  @UsePipes(new ValidationPipe({ transform: true }))
  generate(@Body() dto: GenerateIncomeStatementDto, @Body('generatedBy') generatedBy?: string) {
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
