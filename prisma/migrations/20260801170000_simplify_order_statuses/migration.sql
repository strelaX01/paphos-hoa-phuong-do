-- Keep the database enum values for compatibility, but migrate every active
-- order and timeline entry onto the simplified operational workflow.
UPDATE "Order"
SET "status" = 'PREPARING',
    "confirmedAt" = COALESCE("confirmedAt", "updatedAt")
WHERE "status" = 'CONFIRMED';

UPDATE "Order"
SET "status" = 'PENDING_PICKUP'
WHERE "status" = 'ASSIGNED';

UPDATE "Order"
SET "status" = 'EN_ROUTE',
    "pickedUpAt" = COALESCE("pickedUpAt", "updatedAt")
WHERE "status" = 'PICKED_UP';

UPDATE "OrderTimelineEvent"
SET "status" = 'PREPARING',
    "title" = 'Kitchen started preparing'
WHERE "status" = 'CONFIRMED';

UPDATE "OrderTimelineEvent"
SET "status" = 'PENDING_PICKUP',
    "title" = 'Ready for delivery'
WHERE "status" = 'ASSIGNED';

UPDATE "OrderTimelineEvent"
SET "status" = 'EN_ROUTE',
    "title" = 'Delivery started'
WHERE "status" = 'PICKED_UP';
