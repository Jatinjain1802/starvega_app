# Backend foundation

Requires Node.js 22+, npm and Docker Compose. From repository root:

```sh
docker compose up -d postgres
cd backend
cp .env.example .env
npm install
npm run db:generate
npm test
npm run dev
```

Check `http://localhost:3000/api/v1/health` and `http://localhost:3000/api/v1/ready`. The readiness endpoint checks PostgreSQL. Local credentials are development-only. The Prisma schema is intentionally empty pending the domain model; no application tables or authentication are implemented yet. Tests use a mocked database and do not replace a real PostgreSQL integration test.
