CREATE INDEX IF NOT EXISTS "MenuCategory_isActive_title_idx"
ON "MenuCategory"("isActive", "title");

CREATE INDEX IF NOT EXISTS "MenuItem_categoryId_isActive_sortOrder_idx"
ON "MenuItem"("categoryId", "isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"
ON "Order"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "Reservation_date_status_idx"
ON "Reservation"("date", "status");

CREATE INDEX IF NOT EXISTS "Reservation_phone_date_time_createdAt_idx"
ON "Reservation"("phone", "date", "time", "createdAt");

CREATE INDEX IF NOT EXISTS "Reservation_email_date_time_createdAt_idx"
ON "Reservation"("email", "date", "time", "createdAt");

CREATE INDEX IF NOT EXISTS "GalleryPhoto_status_createdAt_idx"
ON "GalleryPhoto"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "VideoSpecial_status_createdAt_idx"
ON "VideoSpecial"("status", "createdAt");
