import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { RuleEngineService } from './rule-engine.service';
import { RuleEngineProcessor } from './rule-engine.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'rule-engine',
    }),
  ],
  providers: [RuleEngineService, RuleEngineProcessor],
  exports: [RuleEngineService],
})
export class RuleEngineModule {}
