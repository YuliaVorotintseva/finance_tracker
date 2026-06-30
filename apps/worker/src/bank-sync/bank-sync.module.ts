import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { BankSyncService } from './bank-sync.service';
import { BankSyncProcessor } from './bank-sync.processor';
import { EncryptionService } from '../common/encryption.service';
import { BankSyncScheduler } from './bank-sync.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'bank-sync',
    }),
  ],
  providers: [
    BankSyncService,
    BankSyncProcessor,
    EncryptionService,
    BankSyncScheduler,
  ],
  exports: [BankSyncService],
})
export class BankSyncModule {}
