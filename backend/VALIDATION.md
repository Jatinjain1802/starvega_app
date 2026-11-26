# Backend validation

Use Node.js 22 and PostgreSQL 17. Copy .env.example to .env and set a random JWT_SECRET of at least 32 bytes. Never use CI credentials in production.

For a fresh disposable local database only:

```sh
npm install
npx prisma validate
npx prisma generate
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/starvega-baseline.sql
npx prisma db execute --file /tmp/starvega-baseline.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/sql/active-allocation-constraints.sql --schema prisma/schema.prisma
npm test
node --test integration/database.test.js
```

The generated baseline is not a committed migration history. Before production, review and commit an initial migration including the allocation constraints, commit a dependency lockfile, and use prisma migrate deploy. Do not run the disposable baseline against existing data.

CI validates schema, generates the client, applies baseline SQL and runs tests. Passing CI is necessary but not sufficient: authenticated role isolation, payment webhooks, receipt uploads, concurrent writes, notification dispatch and production credentials still require integration coverage. The integration fixture is for disposable databases only.
