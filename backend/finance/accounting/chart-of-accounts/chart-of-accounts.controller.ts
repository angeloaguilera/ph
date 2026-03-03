import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('api/accounting/chart-of-accounts')
export class ChartOfAccountsController {
  constructor(private readonly svc: ChartOfAccountsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() dto: CreateAccountDto) {
    return this.svc.create(dto);
  }

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get('tree')
  getTree() {
    return this.svc.getTree();
  }

  @Get(':idOrCode')
  findOne(@Param('idOrCode') idOrCode: string) {
    return this.svc.findOne(idOrCode);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/adjust-balance')
  adjustBalance(@Param('id') id: string, @Body('amount') amount: number) {
    return this.svc.adjustBalance(id, amount);
  }
}
