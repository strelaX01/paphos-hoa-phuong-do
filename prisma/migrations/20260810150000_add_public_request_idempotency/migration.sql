ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

ALTER TABLE "Reservation"
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key"
ON "Order"("idempotencyKey");

CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_idempotencyKey_key"
ON "Reservation"("idempotencyKey");
