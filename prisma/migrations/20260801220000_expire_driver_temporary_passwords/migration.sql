ALTER TABLE "DriverAccount"
ADD COLUMN IF NOT EXISTS "temporaryPasswordExpiresAt" TIMESTAMP(3);

UPDATE "DriverAccount"
SET "temporaryPasswordExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '24 hours'
WHERE "temporaryPasswordHash" IS NOT NULL
  AND "passwordHash" IS NULL
  AND "temporaryPasswordExpiresAt" IS NULL;
