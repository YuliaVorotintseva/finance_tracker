import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq, and } from 'drizzle-orm';

import { db } from '@repo/db';

import { bankConnections } from '@repo/db/schema';
//import { NordigenService } from './nordigen.service';
//import { EncryptionService } from '../common/encryption.service';
import { BankSyncJobData } from './bank-sync.processor';

@Injectable()
export class BankSyncService {
  private readonly logger = new Logger(BankSyncService.name);

  constructor(
    @InjectQueue('bank-sync')
    private readonly bankSyncQueue: Queue<BankSyncJobData>,
    //private readonly nordigenService: NordigenService,
    //private readonly encryptionService: EncryptionService,
  ) {}

  async syncTransactions(userId: string, connectionId: string): Promise<void> {
    const connection = await db.query.bankConnections.findFirst({
      where: and(
        eq(bankConnections.id, connectionId),
        eq(bankConnections.userId, userId),
      ),
    });

    if (!connection) {
      throw new Error(
        `Connection ${connectionId} not found for user ${userId}`,
      );
    }

    if (connection.status !== 'active') {
      this.logger.warn(
        `Connection ${connectionId} is not active, skipping sync`,
      );
      return;
    }

    //const accessToken = this.encryptionService.decrypt(connection.encryptedAccessToken);

    // TODO: Использовать токен для получения данных из Nordigen

    await db
      .update(bankConnections)
      .set({ lastSyncedAt: new Date() })
      .where(eq(bankConnections.id, connectionId));

    this.logger.log(`Synced transactions for connection ${connectionId}`);
  }

  async refreshConnection(userId: string, connectionId: string): Promise<void> {
    const connection = await db.query.bankConnections.findFirst({
      where: and(
        eq(bankConnections.id, connectionId),
        eq(bankConnections.userId, userId),
      ),
    });

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    // TODO: Реализовать обновление токена через Nordigen

    this.logger.log(`Refreshed connection ${connectionId}`);
  }

  async scheduleSync(userId: string, connectionId: string): Promise<void> {
    await this.bankSyncQueue.add(
      'sync-transactions',
      {
        userId,
        connectionId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async scheduleAllActiveConnections(): Promise<void> {
    const connections = await db.query.bankConnections.findMany({
      where: eq(bankConnections.status, 'active'),
    });

    for (const connection of connections) {
      await this.scheduleSync(connection.userId, connection.id);
    }

    this.logger.log(
      `Scheduled sync for ${connections.length} active connections`,
    );
  }
}
