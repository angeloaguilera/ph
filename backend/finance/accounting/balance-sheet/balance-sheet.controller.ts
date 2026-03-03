import { Body, Controller, Post, UsePipes, ValidationPipe, Get, Param, Query } from '@nestjs/common';
import { BalanceSheetService } from './balance-sheet.service';
import { GenerateBalanceSheetDto } from './dto/generate-balance-sheet.dto';

@Controller('api/accounting/balance-sheet')
export class BalanceSheetController {
  constructor(private readonly svc: BalanceSheetService) {}

  @Post('generate')
  @UsePipes(new ValidationPipe({ transform: true }))
  generate(@Body() dto: GenerateBalanceSheetDto, @Body('generatedBy') generatedBy?: string) {
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
