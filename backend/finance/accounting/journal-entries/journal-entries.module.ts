import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { JournalEntriesResolver } from './journal-entries.resolver';
import { JournalEntry, JournalEntrySchema } from './schemas/journal-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JournalEntry.name, schema: JournalEntrySchema },
      // If you have Account schema in another module you can import it there or reference by name.
      // { name: 'Account', schema: AccountSchema }
    ]),
  ],
  providers: [JournalEntriesService, JournalEntriesResolver],
  controllers: [JournalEntriesController],
  exports: [JournalEntriesService],
})
export class JournalEntriesModule {}
