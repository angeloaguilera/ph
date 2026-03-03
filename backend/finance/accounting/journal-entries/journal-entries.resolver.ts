import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { JournalEntryObjectType, JournalEntryInput } from './graphql/journal-entry.graphql';
import { ParseObjectIdPipe } from '../../../common/pipes/parse-objectid.pipe';

@Resolver(() => JournalEntryObjectType)
export class JournalEntriesResolver {
  constructor(private readonly svc: JournalEntriesService) {}

  @Query(() => [JournalEntryObjectType], { name: 'journalEntries' })
  async findAll(@Args('limit', { type: () => Number, nullable: true }) limit = 50,
                @Args('skip', { type: () => Number, nullable: true }) skip = 0) {
    return this.svc.findAll({}, limit, skip);
  }

  @Query(() => JournalEntryObjectType, { name: 'journalEntry' })
  async findOne(@Args('id', { type: () => String }, ParseObjectIdPipe) id: string) {
    return this.svc.findOne(id);
  }

  @Mutation(() => JournalEntryObjectType)
  async createJournalEntry(@Args('input') input: JournalEntryInput) {
    // convert input -> DTO shape
    const dto: CreateJournalEntryDto = {
      ...input,
      date: input.date,
      lines: input.lines,
      currency: input.currency,
      exchangeRate: input.exchangeRate,
      description: input.description,
      reference: input.reference,
      metadata: input.metadata,
      attachments: input.attachments,
      fiscalPeriod: input.fiscalPeriod,
      fiscalYear: input.fiscalYear,
    } as any;
    return this.svc.create(dto);
  }

  @Mutation(() => JournalEntryObjectType)
  async updateJournalEntry(@Args('id', { type: () => String }, ParseObjectIdPipe) id: string,
                           @Args('input') input: JournalEntryInput) {
    const dto: UpdateJournalEntryDto = { ...input } as any;
    return this.svc.update(id, dto);
  }

  @Mutation(() => Boolean)
  async deleteJournalEntry(@Args('id', { type: () => String }, ParseObjectIdPipe) id: string) {
    await this.svc.remove(id);
    return true;
  }

  @Mutation(() => JournalEntryObjectType)
  async postJournalEntry(@Args('id', { type: () => String }, ParseObjectIdPipe) id: string,
                         @Args('postedBy', { type: () => String, nullable: true }) postedBy?: string) {
    return this.svc.post(id, postedBy);
  }

  @Mutation(() => JournalEntryObjectType)
  async unpostJournalEntry(@Args('id', { type: () => String }, ParseObjectIdPipe) id: string) {
    return this.svc.unpost(id);
  }

  @Mutation(() => JournalEntryObjectType)
  async reverseJournalEntry(@Args('id', { type: () => String }, ParseObjectIdPipe) id: string,
                            @Args('reason', { type: () => String, nullable: true }) reason?: string,
                            @Args('reversedBy', { type: () => String, nullable: true }) reversedBy?: string) {
    return this.svc.reverse(id, reason, reversedBy);
  }
}
