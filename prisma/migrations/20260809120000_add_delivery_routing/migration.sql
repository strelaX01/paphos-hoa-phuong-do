ALTER TABLE "CustomerAddress"
ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7);

ALTER TABLE "Order"
ADD COLUMN "deliveryLatitude" DECIMAL(10,7),
ADD COLUMN "deliveryLongitude" DECIMAL(10,7);

ALTER TABLE "StorefrontSettings"
ADD COLUMN "restaurantLatitude" DECIMAL(10,7),
ADD COLUMN "restaurantLongitude" DECIMAL(10,7),
ADD COLUMN "nearbyDeliveryMaxKm" DECIMAL(8,2) NOT NULL DEFAULT 5.00,
ADD COLUMN "maximumDeliveryKm" DECIMAL(8,2) NOT NULL DEFAULT 15.00;
