ALTER TABLE "AdminUser" ADD COLUMN "username" TEXT;

WITH ranked_admins AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS position
  FROM "AdminUser"
)
UPDATE "AdminUser" AS admin
SET "username" = CASE
  WHEN ranked.position = 1 THEN 'admin'
  ELSE 'admin_' || ranked.position
END
FROM ranked_admins AS ranked
WHERE admin."id" = ranked."id";

ALTER TABLE "AdminUser" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
