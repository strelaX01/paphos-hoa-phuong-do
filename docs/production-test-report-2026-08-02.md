# Production Test Report - 2026-08-02

Source checklist: `test_cases_hoa_phuong_do.md` (TC-001 through TC-130).

## Release checks

| Check | Result | Notes |
| --- | --- | --- |
| Production build | PASS | Next.js 16.2.11 compiled, TypeScript passed, 27 static pages generated. |
| ESLint | PASS | 0 errors; 32 generated Prisma warnings only. |
| Browser runtime | PASS | No browser warnings or errors while traversing public pages. |
| Public page smoke test | PASS | `/`, `/menu`, `/delivery`, `/checkout`, `/book-table`, `/gallery`, `/contact`, login and forgot-password return 200. |
| Public API smoke test | PASS | Menu, categories, delivery menu/config and gallery return 200. |
| Production fonts | PASS | Google build-time dependency replaced with local WOFF2 files. |
| Prisma migration status | BLOCKED | CLI connection to the Supabase migration endpoint timed out; application queries still work. Recheck from deployment network. |
| Password reset delivery | BLOCKED | `AUTH_EMAIL_FROM` is not configured. Use an address on the verified Resend domain. |

## Verified flows

- Homepage renders real videos, menu items, gallery, profile, opening hours and contact data.
- Menu renders DB categories/items and links to delivery/book-table.
- Delivery filter and pagination change the visible items correctly.
- Menu-to-delivery deep link highlights the selected dish.
- Cart add, quantity update, EUR totals, kitchen note and cross-page persistence work.
- Checkout keeps Place Order disabled until required fields and delivery-fee consent are valid.
- Checkout and reservation phone inputs remove letters.
- Empty checkout, reservation form data, guest options, contact data and opening hours render correctly.
- Gallery displays six images per page; lightbox open, next and close work.
- Mobile 375px uses the hamburger header without visible overlap.
- Unauthenticated `/admin` redirects to login; protected admin API returns 401.
- Delivery API exposes no inactive or non-deliverable items.
- Honeypot returns a fake 201 response without entering the database write path.
- Empty cart, 31 distinct dishes and quantity 51 are rejected with 422.
- Payload over 32 KB is rejected with 413.
- Homepage/menu metadata, sitemap and robots rules are present.
- Forgot-password rejects an invalid email with 422; cross-site login is rejected with 403; an invalid reset token is rejected with 400.

## Testcase corrections

- `TC-005`: homepage gallery now opens the shared lightbox; it no longer navigates immediately to `/gallery` by product decision.
- `TC-071`: remove `driver` from order details; assigning an order to a driver was removed by product decision.
- `TC-106` to `TC-108`: drivers now sign in through `/admin/login` and are restricted to `/admin/orders`; there is no separate `/driver` application or assignment model.
- `TC-124` to `TC-126`: validation failures use HTTP 422, not 400. The requests are correctly rejected and the response contains field errors.

## Not executed against live data

- Successful order and reservation creation (`TC-033`, `TC-049`) to avoid creating fake production-like records.
- Authenticated admin CRUD/status/upload/settings flows (`TC-056`, `TC-061` to `TC-105`) because no authenticated test session or isolated test database was supplied.
- Login lockout tests (`TC-055`, `TC-128`) to avoid locking the real development IP/account.
- Invalid/empty/error states requiring API or DB mocks (`TC-008`, `TC-009`, `TC-021`, `TC-035` to `TC-037`).

## Release decision

The public storefront and production build pass the current smoke/regression checks. Do not give final production approval until `AUTH_EMAIL_FROM` is configured and authenticated admin flows, successful order/reservation flows, login lockout, email reset delivery, uploads, and migration status are run against an isolated staging database and storage bucket.
