import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

import { RuleEngineService, CategorizeJobData } from './rule-engine.service';

@Processor('rule-engine')
export class RuleEngineProcessor {
  private readonly logger = new Logger(RuleEngineProcessor.name);

  constructor(private readonly ruleEngineService: RuleEngineService) {}

  @Process('categorize-transactions')
  async handleCategorizeTransactions(job: Job<CategorizeJobData>) {
    const { userId, transactionIds } = job.data;

    this.logger.log(
      `Starting categorization for ${transactionIds.length} transactions`,
    );

    try {
      await this.ruleEngineService.categorizeTransactions(
        userId,
        transactionIds,
      );
      this.logger.log('Successfully categorized transactions');
    } catch (error) {
      this.logger.error('Failed to categorize transactions', error);
      throw error;
    }
  }
}
