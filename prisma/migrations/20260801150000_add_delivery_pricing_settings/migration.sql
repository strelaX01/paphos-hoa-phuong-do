ALTER TABLE "StorefrontSettings"
ADD COLUMN "nearbyDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 3.00,
ADD COLUMN "fartherDeliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 3.50;

ALTER TABLE "Order"
ADD COLUMN "deliveryFeePolicyNearby" DECIMAL(10,2),
ADD COLUMN "deliveryFeePolicyFarther" DECIMAL(10,2);
