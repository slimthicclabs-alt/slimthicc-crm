# SlimThicc Command Center

Internal Next.js app for Ryan and Phil to manage SlimThicc operations manually from one PostgreSQL-backed command center.

## Modules

- Dashboard: follow-ups due today, overdue follow-ups, hot leads, recent interactions, open deals, daily objectives, overdue objectives, pinned notes, and quick-add links
- CRM: contacts, pipeline statuses, owners, tags, notes, follow-up dates, interactions, linked tasks, and wholesale deal tracking
- Daily Objectives: shared checklist for Ryan and Phil with priority, status, due dates, recurring flags, categories, overdue visibility, and completed section
- Notes Board: searchable shared note cards with categories, tags, owners, and pinned notes

## Tech

- Next.js
- TypeScript
- Tailwind
- shadcn/ui-style local components
- Prisma
- PostgreSQL

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `DATABASE_URL`.

3. If you want a local database with Docker:

```bash
docker compose up -d
```

4. Push the Prisma schema:

```bash
npm run db:push
```

5. Seed sample SlimThicc data:

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy

Use a host that supports Next.js and PostgreSQL, such as Vercel plus Neon/Supabase Postgres, or Render with a managed Postgres database.

Required environment variable:

```bash
DATABASE_URL=postgresql://...
```

Optional environment variable for a shared Ryan/Phil passcode:

```bash
APP_PASSCODE=your-private-passcode
```

Build command:

```bash
npm run build
```

Start command:

```bash
npm start
```

Run this once against the production database before launch:

```bash
npm run db:push
```

Then optionally:

```bash
npm run db:seed
```
