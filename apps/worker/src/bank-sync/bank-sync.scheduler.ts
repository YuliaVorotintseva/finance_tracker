import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BankSyncService } from './bank-sync.service';

@Injectable()
export class BankSyncScheduler {
  private readonly logger = new Logger(BankSyncScheduler.name);

  constructor(private readonly bankSyncService: BankSyncService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async handleScheduledSync() {
    this.logger.log('Running scheduled bank sync');

    try {
      await this.bankSyncService.scheduleAllActiveConnections();
    } catch (error) {
      this.logger.error('Failed to run scheduled bank sync', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReport() {
    this.logger.log('Generating daily report');
    // TODO: Реализовать генерацию ежедневного отчета
  }
}
