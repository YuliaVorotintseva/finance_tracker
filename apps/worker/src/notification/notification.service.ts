import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';

import { db } from '@repo/db';
import { transactions, users } from '@repo/db/schema';

export interface NotificationJobData {
  userId: string;
  type: 'new_transaction' | 'large_expense' | 'subscription_detected';
  data: any;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue<NotificationJobData>,
  ) {}

  async sendNotification(
    userId: string,
    type: NotificationJobData['type'],
    data: any,
  ): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.email) {
      this.logger.warn(`User ${userId} not found or has no email`);
      return;
    }

    let subject: string;
    let message: string;

    switch (type) {
      case 'new_transaction':
        subject = 'New transaction';
        message = `New transaction in the amount of ${data.amount} ${data.currency}`;
        break;

      case 'large_expense':
        subject = 'Large expense';
        message = `Fixed large expense in the amount of ${data.amount}`;
        break;

      case 'subscription_detected':
        subject = 'Subscription detected';
        message = `Detected regular subscription: ${data.name} in the amount of ${data.amount}`;
        break;

      default:
        this.logger.warn(`Unknown notification type: ${type}`);
        return;
    }

    this.logger.log(
      `Notification prepared for ${user.email}: ${subject}, ${message}`,
    );
  }

  async sendTransactionNotification(
    userId: string,
    transactionId: string,
  ): Promise<void> {
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    });

    if (!transaction) return;

    await this.notificationQueue.add('send-notification', {
      userId,
      type: 'new_transaction',
      data: {
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        merchantName: transaction.merchantName,
      },
    });
  }

  async sendLargeExpenseNotification(
    userId: string,
    amount: string,
  ): Promise<void> {
    await this.notificationQueue.add('send-notification', {
      userId,
      type: 'large_expense',
      data: { amount },
    });
  }
}
