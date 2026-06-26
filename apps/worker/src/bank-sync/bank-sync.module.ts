import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { BankSyncService } from './bank-sync.service';
import { BankSyncProcessor } from './bank-sync.processor';
import { NordigenService } from './nordigen.service';
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
    NordigenService,
    EncryptionService,
    BankSyncScheduler,
  ],
  exports: [BankSyncService],
})
export class BankSyncModule {}
