CREATE TABLE IF NOT EXISTS "MenuItemVariant" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MenuItemVariant_menuItemId_fkey"
      FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuItemVariant_menuItemId_label_key"
  ON "MenuItemVariant"("menuItemId", "label");
CREATE INDEX IF NOT EXISTS "MenuItemVariant_menuItemId_isActive_sortOrder_idx"
  ON "MenuItemVariant"("menuItemId", "isActive", "sortOrder");

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantLabel" TEXT;
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_variantId_fkey'
  ) THEN
    ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "MenuItemVariant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
