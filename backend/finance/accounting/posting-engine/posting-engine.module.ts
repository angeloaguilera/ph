import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostingEngineService } from './posting-engine.service';
import { JournalEntry, JournalEntrySchema } from '../journal-entries/schemas/journal-entry.schema';


@Module({
imports: [MongooseModule.forFeature([{ name: JournalEntry.name, schema: JournalEntrySchema }])],
providers: [PostingEngineService],
exports: [PostingEngineService],
})
export class PostingEngineModule {}