-- Apply through a reviewed Prisma migration after creating the core tables.
CREATE UNIQUE INDEX "Allocation_one_active_bed" ON "Allocation" ("bedId") WHERE "endedAt" IS NULL;
CREATE UNIQUE INDEX "Allocation_one_active_resident" ON "Allocation" ("residentId") WHERE "endedAt" IS NULL;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_valid_dates" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");
