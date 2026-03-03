import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';

@Controller('api/accounting/journal-entries')
export class JournalEntriesController {
  constructor(private readonly svc: JournalEntriesService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() dto: CreateJournalEntryDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateJournalEntryDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/post')
  post(@Param('id') id: string, @Body('postedBy') postedBy?: string) {
    return this.svc.post(id, postedBy);
  }

  @Post(':id/unpost')
  unpost(@Param('id') id: string) {
    return this.svc.unpost(id);
  }

  @Post(':id/reverse')
  reverse(@Param('id') id: string, @Body('reason') reason?: string, @Body('reversedBy') reversedBy?: string) {
    return this.svc.reverse(id, reason, reversedBy);
  }
}
