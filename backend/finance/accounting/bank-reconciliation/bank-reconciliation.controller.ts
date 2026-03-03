// finance/accounting/bank-reconciliation/bank-reconciliation.controller.ts
import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Param,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BankReconciliationService } from './bank-reconciliation.service';
import { ImportBankStatementDto } from './dto/import-statement.dto';
import { ManualMatchDto, FinalizeReconciliationDto } from './dto/reconcile.dto';

@Controller('api/accounting/bank-reconciliation')
export class BankReconciliationController {
  constructor(private readonly svc: BankReconciliationService) {}

  // Upload file (multipart) - fileContent is read in controller and passed as string
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: any, @Body() body: ImportBankStatementDto) {
    if (!file) throw new Error('File is required');
    const content = file.buffer.toString('utf8');
    return this.svc.importStatement(content, body);
  }

  @Post(':id/auto-match')
  autoMatch(@Param('id') id: string, @Body('toleranceDays') toleranceDays?: number, @Body('toleranceAmount') toleranceAmount?: number) {
    return this.svc.autoMatch(id, { toleranceDays, toleranceAmount });
  }

  @Post('manual-match')
  manualMatch(@Body() dto: ManualMatchDto) {
    return this.svc.manualMatch(dto);
  }

  @Post(':statementId/unmatch/:lineId')
  unmatch(@Param('statementId') statementId: string, @Param('lineId') lineId: string) {
    return this.svc.unmatch(statementId, lineId);
  }

  @Post('start/:statementId')
  startReconciliation(@Param('statementId') statementId: string) {
    return this.svc.startReconciliation(statementId);
  }

  @Post('finalize')
  finalize(@Body() dto: FinalizeReconciliationDto) {
    return this.svc.finalize(dto);
  }

  @Get('statement/:id')
  getStatement(@Param('id') id: string) {
    return this.svc.getStatement(id);
  }

  @Get('unmatched/:statementId')
  getUnmatched(@Param('statementId') statementId: string) {
    return this.svc.getUnmatchedLines(statementId);
  }

  @Get('reconciliations')
  listReconciliations(@Query('limit') limit = '50', @Query('skip') skip = '0') {
    return this.svc.listReconciliations(Number(limit), Number(skip));
  }

  @Get('reconciliation/:id')
  getReconciliation(@Param('id') id: string) {
    return this.svc.getReconciliation(id);
  }
}
