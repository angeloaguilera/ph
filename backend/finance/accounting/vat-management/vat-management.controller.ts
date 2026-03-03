import { Body, Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { VatManagementService } from './vat-management.service';
import { CreateVatTransactionDto } from './dto/create-vat-transaction.dto';
import { CreateVatRuleDto } from './dto/vat-rule.dto';
import { GenerateVatReportDto } from './dto/generate-vat-report.dto';

@Controller('api/accounting/vat')
export class VatManagementController {
  constructor(private readonly svc: VatManagementService) {}

  @Post('rules')
  @UsePipes(new ValidationPipe({ transform: true }))
  createRule(@Body() dto: CreateVatRuleDto) {
    return this.svc.createRule(dto);
  }

  @Get('rules')
  listRules() {
    return this.svc.listRules();
  }

  @Post('transactions')
  @UsePipes(new ValidationPipe({ transform: true }))
  createVatTransaction(@Body() dto: CreateVatTransactionDto) {
    return this.svc.registerVatTransaction(dto, true);
  }

  @Post('transactions/draft')
  @UsePipes(new ValidationPipe({ transform: true }))
  createVatTransactionDraft(@Body() dto: CreateVatTransactionDto) {
    return this.svc.registerVatTransaction(dto, false);
  }

  @Post('transactions/:id/post')
  postTransaction(@Param('id') id: string, @Body('postedBy') postedBy?: string) {
    return this.svc.postVatTransaction(id, postedBy);
  }

  @Post('reports/generate')
  @UsePipes(new ValidationPipe({ transform: true }))
  generateReport(@Body() dto: GenerateVatReportDto, @Body('generatedBy') generatedBy?: string) {
    return this.svc.generateVatReport(dto, generatedBy);
  }

  @Get('reports/:id')
  getReport(@Param('id') id: string) {
    return this.svc.getReport(id);
  }

  @Get('reports')
  listReports(@Query('limit') limit = '50', @Query('skip') skip = '0') {
    return this.svc.listReports(Number(limit), Number(skip));
  }
}
