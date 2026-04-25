# Deploy SlimThicc Command Center

Fastest clean setup:

1. Create a PostgreSQL database with Neon, Supabase, Render Postgres, or Railway.
2. Copy the database connection string.
3. Deploy this repo to Vercel or Render as a Next.js app.
4. Add this environment variable:

```bash
DATABASE_URL=postgresql://...
```

Optional but recommended:

```bash
APP_PASSCODE=pick-a-private-passcode-for-ryan-and-phil
```

5. Before using the app, run Prisma against that database:

```bash
npm install
npm run db:push
npm run db:seed
```

For Vercel, connect the GitHub repo, set `DATABASE_URL`, deploy, then run `npm run db:push` locally using the same production `DATABASE_URL`.

For Render, create a Web Service:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/healthz`
- Environment variables: `DATABASE_URL`, optional `APP_PASSCODE`

If you use migrations later, use `npm run db:migrate:deploy` instead of `npm run db:push` for production.

This v1 is manual and database-backed. No email, Shopify, Amazon, or external automations are connected yet.
