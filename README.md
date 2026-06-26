# Liquid Ledger

Web-first expense management application for finance teams, directors, and employees. Built with **Next.js (App Router)**, **TypeScript**, **MongoDB**, and **Tailwind CSS**.

## Features

- **Roles**: System Admin, Finance, Director, Employee
- **Claim lifecycle**: Submit → Finance review → Batch → Director approval → Excel payout export → Disburse
- **Proof uploads**: PDF, DOCX, DOC, images (local storage; S3-ready abstraction)
- **Dynamic categories** and reason autocomplete
- **In-app notifications** (SMS/WhatsApp-ready architecture)
- **Reports**: per event, per employee, organisation-wide with CSV/Excel export
- **Server-side pagination**, search, filters on all data tables (10 rows/page)
- **Phone + password** authentication with JWT (httpOnly cookie)

## Prerequisites

- Node.js 18+
- MongoDB running locally (or Atlas connection string)

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Seed initial System Admin (phone: 9999999999, password: admin123)
npm run seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seeded admin credentials.

## User Flow

1. **System Admin** creates Finance users and manages claim categories
2. **Finance** creates Finance/Director/Employee users, events, assigns budgets
3. **Employee** submits claims with mandatory proof attachments
4. **Finance** reviews and approves/rejects claims
5. **Finance** clubs approved claims per event into batches for Director
6. **Director** approves/rejects batches
7. **Finance** downloads Excel payout file and marks claims disbursed

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `UPLOAD_DIR` | Local upload directory (default: `uploads`) |
| `STORAGE_PROVIDER` | `local` (default) or `s3` |

## Production: AWS S3 Storage

**Before going to production**, configure AWS S3 for proof file storage:

1. Create an S3 bucket and IAM credentials
2. Set in `.env`:
   ```
   STORAGE_PROVIDER=s3
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=your-bucket
   ```
3. Implement `S3StorageProvider` in `src/lib/storage.ts` (stub included)

Local filesystem storage is used for development only.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run seed` | Create initial System Admin |
| `npm run lint` | Run ESLint |

## Default Seed Credentials

- Phone: `9999999999`
- Password: `admin123`

Override with `SEED_ADMIN_PHONE` and `SEED_ADMIN_PASSWORD` env vars when running seed.
