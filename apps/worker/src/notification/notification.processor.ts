import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  NotificationService,
  NotificationJobData,
} from './notification.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJobData>) {
    const { userId, type, data } = job.data;

    this.logger.log(
      `Processing notification for user ${userId}, type: ${type}`,
    );

    try {
      await this.notificationService.sendNotification(userId, type, data);
      this.logger.log(`Successfully sent notification to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}`, error);
      throw error;
    }
  }

  @Process('send-email')
  async handleSendEmail(
    job: Job<{ userId: string; subject: string; html: string }>,
  ) {
    const { userId, subject } = job.data;

    this.logger.log(`Sending email to user ${userId}: ${subject}`);

    try {
      // TODO: Интеграция с Resend или другим email сервисом
      this.logger.log(`Email sent successfully to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to user ${userId}`, error);
      throw error;
    }
  }
}
