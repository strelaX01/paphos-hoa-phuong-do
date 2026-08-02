# API architecture

## Boundaries

- Client Components call HTTP endpoints under `/api`.
- Server Components call `server-only` data modules directly. They must not make an HTTP request back to the same Next.js server.
- Route Handlers authenticate, parse and validate the request, call the data or domain layer, and serialize an allowlisted DTO.
- Checkout always reloads menu prices and availability from the database. Client totals are never trusted.

## Resource URLs

- Collection: `/api/admin/orders`
  - `GET` lists resources.
  - `POST` creates a resource when creation is supported.
- Member: `/api/admin/orders/{orderId}`
  - `GET` reads one resource when needed.
  - `PATCH` applies a partial update.
  - `PUT` replaces the editable representation.
  - `DELETE` removes the resource.
- Subresource or action: `/api/admin/drivers/{driverId}/reset-password`
  - Use an action URL only when the operation is not normal CRUD.
- Summary: `/api/admin/orders/summary`
  - Keep aggregate DTOs separate from collection DTOs.

Resource IDs belong in the URL, not in a mutation request body.

## Responses

- Success payload: `{ "data": ... }`.
- Lists may also return `pagination`, `summary`, or `meta`.
- Failure payload: `{ "error": "..." }` or `{ "errors": { ... } }` for field validation.
- Use `201` for creation, `400` for malformed requests, `401` for unauthenticated requests, `403` for forbidden actions, `404` for missing resources, `409` for conflicts, `422` for valid JSON with invalid fields, `429` for rate limits, and `500` for unexpected failures.
- Never expose stack traces, Prisma errors, password hashes, storage credentials, session tokens, or unpublished storefront records.

## Access

- Public read endpoints return only active or published records and explicit fields.
- Every `/api/admin` resource route must call `authorizeAdminRequest`; auth lifecycle routes use their dedicated session and rate-limit controls.
- Proxy rules are defense in depth. Route-level authorization remains mandatory.
- Driver access is limited to listing orders, reading the order summary, updating an allowed order status, and changing the driver's own password.

## Current public resources

- `GET /api/menu`
- `GET /api/menu/categories`
- `GET /api/gallery`
- `GET /api/delivery/menu`
- `GET /api/delivery/config`
- `POST /api/orders`
- `POST /api/reservations`
