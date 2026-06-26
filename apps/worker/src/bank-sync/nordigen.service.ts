import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

const NordigenTokenSchema = z.object({
  access: z.string(),
  access_expires: z.number(),
  refresh: z.string(),
  refresh_expires: z.number(),
});

const NordigenAccountSchema = z.object({
  id: z.string(),
  created: z.string(),
  last_accessed: z.string(),
  iban: z.string().optional(),
  institution_id: z.string(),
  status: z.string(),
  owner_name: z.string().optional(),
});

const NordigenBalanceSchema = z.object({
  balances: z.array(
    z.object({
      balanceAmount: z.object({
        amount: z.string(),
        currency: z.string(),
      }),
      balanceType: z.string(),
    }),
  ),
});

const NordigenTransactionSchema = z.object({
  transactions: z.object({
    booked: z.array(
      z.object({
        transactionId: z.string(),
        bookingDate: z.string(),
        valueDate: z.string(),
        transactionAmount: z.object({
          amount: z.string(),
          currency: z.string(),
        }),
        creditorName: z.string().optional(),
        debtorName: z.string().optional(),
        remittanceInformationUnstructured: z.string().optional(),
        bankTransactionCode: z.string().optional(),
      }),
    ),
    pending: z.array(
      z.object({
        transactionId: z.string().optional(),
        bookingDate: z.string().optional(),
        valueDate: z.string(),
        transactionAmount: z.object({
          amount: z.string(),
          currency: z.string(),
        }),
        creditorName: z.string().optional(),
        debtorName: z.string().optional(),
        remittanceInformationUnstructured: z.string().optional(),
      }),
    ),
  }),
});

export type NordigenToken = z.infer<typeof NordigenTokenSchema>;
export type NordigenAccount = z.infer<typeof NordigenAccountSchema>;
export type NordigenBalance = z.infer<typeof NordigenBalanceSchema>;
export type NordigenTransaction = z.infer<typeof NordigenTransactionSchema>;

@Injectable()
export class NordigenService {
  private readonly logger = new Logger(NordigenService.name);
  private readonly httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.httpClient = axios.create({
      baseURL: process.env.NORDIGEN_BASE_URL,
      timeout: 10000,
    });
  }

  async authenticate(): Promise<void> {
    const secretId = process.env.NORDIGEN_SECRET_ID;
    const secretKey = process.env.NORDIGEN_SECRET_KEY;

    if (!secretId || !secretKey) {
      throw new Error('Nordigen credentials not configured');
    }

    try {
      const response = await this.httpClient.post('/token/new/', {
        secret_id: secretId,
        secret_key: secretKey,
      });

      const token = NordigenTokenSchema.parse(response.data);
      this.accessToken = token.access;
      this.tokenExpiresAt = Date.now() + token.access_expires * 1000;

      this.logger.log('Successfully authenticated with Nordigen');
    } catch (error) {
      this.logger.error('Failed to authenticate with Nordigen', error);
      throw error;
    }
  }

  async refreshToken(): Promise<void> {
    //const secretId = process.env.NORDIGEN_SECRET_ID;
    const secretKey = process.env.NORDIGEN_SECRET_KEY;

    try {
      const response = await this.httpClient.post('/token/refresh/', {
        refresh: secretKey,
      });

      const token = NordigenTokenSchema.parse(response.data);
      this.accessToken = token.access;
      this.tokenExpiresAt = Date.now() + token.access_expires * 1000;

      this.logger.log('Successfully refreshed Nordigen token');
    } catch (error) {
      this.logger.error('Failed to refresh Nordigen token', error);
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  async getAccounts(): Promise<NordigenAccount[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get('/accounts/', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      return z.array(NordigenAccountSchema).parse(response.data);
    } catch (error) {
      this.logger.error('Failed to fetch accounts from Nordigen', error);
      throw error;
    }
  }

  async getAccountBalance(accountId: string): Promise<NordigenBalance> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get(
        `/accounts/${accountId}/balances/`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        },
      );

      return NordigenBalanceSchema.parse(response.data);
    } catch (error) {
      this.logger.error(
        `Failed to fetch balance for account ${accountId}`,
        error,
      );
      throw error;
    }
  }

  async getAccountTransactions(
    accountId: string,
  ): Promise<NordigenTransaction> {
    await this.ensureAuthenticated();

    try {
      const response = await this.httpClient.get(
        `/accounts/${accountId}/transactions/`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        },
      );

      return NordigenTransactionSchema.parse(response.data);
    } catch (error) {
      this.logger.error(
        `Failed to fetch transactions for account ${accountId}`,
        error,
      );
      throw error;
    }
  }
}
