# Starvega PG backend

Requires Node.js 22+, npm and Docker Compose. From repository root:

```sh
docker compose up -d postgres
cd backend
cp .env.example .env
npm install
```

Set JWT_SECRET in .env to a securely generated value of at least 32 bytes. Keep local credentials out of Git.

## Fresh local database only

The repository has a Prisma schema and supplemental SQL constraints but no verified production migration history. On a NEW empty local database only:

```sh
npx prisma validate
npm run db:generate
npx prisma db push
npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/validation-constraints.sql
```

Do not rerun the constraint SQL blindly: named CHECK constraints are not idempotent. Do not use db push or reset on a production database. Establish and test versioned migrations before deployment.

## Optional development seed

On the empty local starvega database, set NODE_ENV=development, ALLOW_DEMO_SEED=yes and DEMO_PASSWORD to a private 12–128 character password in your local .env. Then:

```sh
npm run db:seed:demo
```

All demo accounts use the password you selected. Demo owner: +919000000001. Managers: +919000000002 and +919000000003. Residents: +919000000010 through +919000000018. Manager A has BTM and HSR; Manager B has Koramangala. These are synthetic identifiers and must not be contacted. Seed uses one transaction, refuses a nonempty user table unless the demo owner already exists (then skips), and never deletes data. Receipt images are tiny synthetic PNG fixtures, not real bills. No payment gateway calls or push delivery are performed by the seed. Do not enable real push delivery against demo data.

## Start and verify

```sh
npm test
npm run dev
```

Check http://localhost:3000/api/v1/health and http://localhost:3000/api/v1/ready. The readiness endpoint checks PostgreSQL. Test all roles, authorization, concurrent allocations, payments and receipts locally. Seed, schema initialization and tests have not been executed in this development session.
