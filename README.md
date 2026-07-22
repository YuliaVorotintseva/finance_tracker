# Finance Tracker

A modern application for thorough financial accounting with smart categorization and detailed analytics.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/tests-87%25-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-87%25-brightgreen)

## Key Features

### Financial Management

- **Manual Transaction Entry** — Quickly add income and expenses
- **Smart Categorization** — Rule Engine for automatic transaction classification
- **CSV Import** — Upload statements from any bank (Sberbank, Tinkoff, Alfa, VTB)

### Analytics and Reports

- **Dashboard** — Key metrics: income, expenses, balance
- **Expense Charts** — Visualization by category and time
- **Period Comparison** — Analysis of expense dynamics

### Security

- **AES-256-GCM Encryption** — Bank tokens are protected in the database
- **Rate Limiting** — Protection from DDoS attacks
- **Security Headers** — CSP, HSTS, XSS protection
- **OAuth 2.0** — Login via GitHub, Google, email/password

## 🛠 Tech stack

### Frontend

- **Next.js 15** — React framework with App Router and Server Components
- **React 19** — the latest version with new hooks
- **TypeScript 5.9** — strong typing
- **Tailwind CSS** — utility-first CSS framework
- **tRPC** — end-to-end typing from API to UI
- **React Query** — server state management
- **Zod** — schema validation

### Backend

- **NestJS 10** — Node.js framework for worker
- **tRPC** — type-safe API
- **Drizzle ORM** — modern ORM for TypeScript
- **PostgreSQL 16** — primary database
- **Redis (Upstash)** — caching and queues
- **BullMQ** — background processing tasks

### Infrastructure

- **Docker** — containerization
- **GitHub Actions** — CI/CD
- **Codecov** — test coverage

### Testing

- **Vitest** — unit and integration tests (87% coverage)
- **Playwright** — E2E tests

## Monorepo

```bash
finance-tracker/
├── apps/
│ ├── web/ # Next.js app
│ └── worker/ # NestJS worker for background tasks
├── packages/
│ ├── api/ # tRPC routers and business logic
│ ├── db/ # Drizzle ORM circuits and client
│ ├── ui/ # Reusable UI components
│ ├── crypto/ # Encryption utilities
│ ├── eslint-config/ # ESLint configuration
│ └── typescript-config/ # TypeScript configuration
└── docker-compose.yml # Local development
```

## Screenshots

### Login page

![Login page](images/login.png)

### Logup page

![Logup page](images/register.png)

### Add new category component

![Add new category](images/new-category.png)

### Categories page

![Categories page](images/categories.png)

### Add new transaction component

![Add new transaction](images/new-transaction.png)

### Transactions page

![Transactions page](images/transactions.png)

### Monthly earnings and income data page

![Dashbord](images/dashbord.png)

### Page for adding new transactions by parsing bank statements in CSV format

![Import CSV file](images/import.png)

### CSV file parsing result

![CSV file parsing result](images/import-new-transactions.png)

### Add new transactions

![Add new transactions](images/import-add-new-transactions.png)

## Quick start

### Requirements

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose
- PostgreSQL 16+ (or Docker)

### Installation

1. **Clone repo**

```bash
git clone git@github.com:YuliaVorotintseva/finance_tracker.git
cd finance-tracker
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
# Copy example .env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env

# Generate an encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add the key to both .env files
```

4. **Start the database**

```bash
docker-compose up -d postgres
```

5. **Apply migrations**

```bash
pnpm --filter @repo/db db:push
```

6. **Launch the application**

```bash
pnpm dev

# Open http://localhost:3000
```

## Testing

### Unit tests

```bash
# Launch all tests
pnpm test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### E2E tests

```bash
# Launch Playwright tests
pnpm test:e2e

# With UI
pnpm test:e2e:ui
```

### Type checking and linting

```bash
pnpm type-check
pnpm lint
```

## Security

- **Rate limiting** — brute force protection
- **Security headers** — CSP, HSTS, X-Frame-Options
- **SQL injection protection** — parameterized queries
- **XSS protection** — input data sanitization
- **CSRF protection** — form tokens

## Author

**Vorotintseva Yulia**

- **GitHub**: @YuliaVorotintseva
- **Email**: yulia.vorotintseva@gmail.com

## Technologies

- **Next.js** (https://nextjs.org/) — an excellent full-stack framework
- **NestJS** (https://nestjs.com/) — an excellent backend framework
- **tRPC** (https://trpc.io/) — end-to-end typing
- **Drizzle ORM** (https://orm.drizzle.team/) — a modern ORM
- **Tailwind CSS** (https://tailwindcss.com/) — utility-first CSS
