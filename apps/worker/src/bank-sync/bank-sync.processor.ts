import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

import { BankSyncService } from './bank-sync.service';

export interface BankSyncJobData {
  userId: string;
  connectionId: string;
}

@Processor('bank-sync')
export class BankSyncProcessor {
  private readonly logger = new Logger(BankSyncProcessor.name);

  constructor(private readonly bankSyncService: BankSyncService) {}

  @Process('sync-transactions')
  async handleSyncTransactions(job: Job<BankSyncJobData>) {
    const { userId, connectionId } = job.data;

    this.logger.log(
      `Starting sync for user ${userId}, connection ${connectionId}`,
    );

    try {
      await this.bankSyncService.syncTransactions(userId, connectionId);
      this.logger.log(
        `Successfully synced transactions for connection ${connectionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync transactions for connection ${connectionId}`,
        error,
      );
      throw error;
    }
  }

  @Process('refresh-connection')
  async handleRefreshConnection(job: Job<BankSyncJobData>) {
    const { userId, connectionId } = job.data;

    this.logger.log(`Refreshing connection ${connectionId} for user ${userId}`);

    try {
      await this.bankSyncService.refreshConnection(userId, connectionId);
      this.logger.log(`Successfully refreshed connection ${connectionId}`);
    } catch (error) {
      this.logger.error(`Failed to refresh connection ${connectionId}`, error);
      throw error;
    }
  }
}
