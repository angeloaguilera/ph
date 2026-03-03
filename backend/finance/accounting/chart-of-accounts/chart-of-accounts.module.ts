import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsResolver } from './chart-of-accounts.resolver';
import { Account, AccountSchema } from './schemas/account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
  ],
  providers: [ChartOfAccountsService, ChartOfAccountsResolver],
  controllers: [ChartOfAccountsController],
  exports: [ChartOfAccountsService],
})
export class ChartOfAccountsModule {}
