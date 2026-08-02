CREATE TEMP TABLE "_WeeklyOpeningHours" (
  "day" TEXT NOT NULL,
  "hours" TEXT NOT NULL,
  "isClosed" BOOLEAN NOT NULL,
  "sortOrder" INTEGER NOT NULL
) ON COMMIT DROP;

INSERT INTO "_WeeklyOpeningHours" ("day", "hours", "isClosed", "sortOrder")
SELECT
  weekday."day",
  COALESCE(schedule."hours", weekday."fallbackHours"),
  COALESCE(schedule."isClosed", FALSE),
  weekday."sortOrder"
FROM (
  VALUES
    ('Monday', 0, '11:00 - 22:00'),
    ('Tuesday', 1, '11:00 - 22:00'),
    ('Wednesday', 2, '11:00 - 22:00'),
    ('Thursday', 3, '11:00 - 22:00'),
    ('Friday', 4, '11:00 - 22:00'),
    ('Saturday', 5, '11:00 - 23:00'),
    ('Sunday', 6, '12:00 - 21:00')
) AS weekday("day", "sortOrder", "fallbackHours")
LEFT JOIN LATERAL (
  SELECT existing."hours", existing."isClosed"
  FROM "OpeningHour" AS existing
  WHERE
    LOWER(TRIM(existing."day")) = LOWER(weekday."day")
    OR LOWER(TRIM(existing."day")) IN ('daily', 'every day', 'all week')
    OR (
      weekday."sortOrder" BETWEEN 0 AND 4
      AND LOWER(TRIM(existing."day")) IN ('weekdays', 'monday - friday', 'monday-friday', 'monday to friday')
    )
    OR (
      weekday."sortOrder" IN (5, 6)
      AND LOWER(TRIM(existing."day")) = 'weekends'
    )
  ORDER BY
    CASE WHEN LOWER(TRIM(existing."day")) = LOWER(weekday."day") THEN 0 ELSE 1 END,
    existing."sortOrder" ASC,
    existing."createdAt" ASC
  LIMIT 1
) AS schedule ON TRUE;

DELETE FROM "OpeningHour";

INSERT INTO "OpeningHour" ("id", "day", "hours", "isClosed", "sortOrder", "createdAt", "updatedAt")
SELECT
  'weekly-' || LOWER("day"),
  "day",
  "hours",
  "isClosed",
  "sortOrder",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "_WeeklyOpeningHours"
ORDER BY "sortOrder";
