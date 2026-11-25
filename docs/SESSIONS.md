# Build plan and Claude Code session prompts

Generated from `docs/source.md`.

About 9 weeks. The website and Partner app go live in week 7, and the customer app follows in the stores around week 9, so store review never holds up the launch. Jatin runs the Claude Code sessions. Garry reviews only sessions 1, 4 and 5 (auth, payments, order state), the parts that cost real money if wrong.

| Week | Work                                                                                                                  | Sessions | Owners                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| 1    | Scaffold, auth, menu and admin menu; legal pages live; WhatsApp templates submitted; store developer accounts started | 0–2      | Jatin; Kirandeep collects menu, KYC docs, WhatsApp number, D-U-N-S and store accounts; Jaskaran preps food photos |
| 2    | Storefront, cart, checkout, payments                                                                                  | 3–4      | Jatin; Garry reviews payments                                                                                     |
| 3    | Order lifecycle API, realtime, rider API and tracking page                                                            | 5–6      | Jatin; Garry reviews the state machine                                                                            |
| 4    | Notifications and push, account, admin                                                                                | 7–8      | Jatin                                                                                                             |
| 5–6  | Partner app: foundation, kitchen, rider                                                                               | 9–11     | Jatin                                                                                                             |
| 7    | Hardening, GCP deploy, 2-day dry run with staff placing real orders; website + Partner app launch                     | 12       | Jatin; Kirandeep sets up the tablet and trains staff and riders                                                   |
| 8–9  | Customer app, then Play Store and App Store submission                                                                | 13–15    | Jatin; Jaskaran makes the store icon and screenshots                                                              |

Launch push, sold by Aman as part of the package: Jaskaran does QR table tents and bag inserts; Vansh / Vivek / Jaskirat do launch reels; Meta ads with a first-order coupon. Hosting, WhatsApp, Maps and Firebase usage go on a monthly maintenance retainer, passed through at cost plus margin.

**How to run:** one session per prompt, `/clear` between sessions. Start each in plan mode, approve the plan, then let it build. Merge only when its tests pass.

**Run order:** 0–8, then the Partner app (9–11), then deploy and launch (12), then the customer app (13–15). Session 0 was built before the doc moved to Flutter + GCP and needs nothing new.

## Session 0 — Scaffold (done)

```
Read docs/PRD.md and docs/BLUEPRINT.md first. Set up the monorepo exactly as BLUEPRINT "Repo layout" describes.
- pnpm workspaces, TypeScript strict, ESM everywhere.
- apps/api: Express 5, Mongoose, zod, pino, helmet, cors, express-rate-limit, Sentry. GET /health reports Mongo and Redis status. src/worker.ts boots BullMQ processors.
- apps/web: Next.js App Router (latest stable), Tailwind, Sentry. Route groups (store), (kitchen), (rider), (admin) with placeholder pages.
- packages/shared: zod schemas, ORDER_STATUS enum + ALLOWED_TRANSITIONS map, empty pricing.ts.
- Env loader validated with zod; .env.example per app. docker-compose.yml for local Mongo + Redis only.
- ESLint, Prettier, Vitest; ecosystem.config.cjs for PM2 (web, api, worker).
- Write CLAUDE.md: commands, folder conventions, money in paise, "server recomputes all prices via shared pricing.ts", "order.status changes only through orders.transition()".
Done when: pnpm dev runs everything, /health is green, pnpm test passes.
```

## Session 1 — Auth

```
Build phone-OTP auth in apps/api/src/modules/auth and the web login UI.
- POST /auth/otp/send {phone}: validate Indian mobile, 6-digit code, hash into otpSessions (TTL 5 min), max 3 sends per phone per 15 min + per-IP limit. Deliver via notifications.sendOtp() (WhatsApp auth template, MSG91 SMS fallback); in dev just log it.
- POST /auth/otp/verify: max 5 attempts; create user on first login; return access JWT (15 min) in the body. Refresh token (30 days): httpOnly SameSite=Lax cookie for web; in the body when the request carries header X-Client: app (the Flutter apps keep it in secure storage). Store the refresh hash with a family id, rotate on use, revoke the family on reuse.
- POST /auth/refresh (cookie or body), POST /auth/logout, GET /me, PATCH /me (name, addresses), POST /me/devices {fcmToken, app: customer|partner, platform} upserting into user.devices.
- Middleware requireAuth and requireRole('staff'|'rider'|'admin'). Seed script creates the admin from ADMIN_PHONE.
- Set up @asteasolutions/zod-to-openapi: every route registers its request and response schemas; serve GET /openapi.json. Add a CLAUDE.md rule that every new route must register.
- Web: OTP bottom sheet used at checkout; login page for /admin; fetch wrapper refreshes on 401 once.
Tests: send limits, attempt lockout, rotation + reuse detection for both cookie and body clients, role guard.
```

## Session 2 — Menu and uploads

```
Menu module + admin menu UI (/admin/menu). Models per BLUEPRINT "Data model" (outlet seeded, category, menuItem).
- GET /menu: categories with available items, respecting outlet hours and category time windows; Redis cache 60 s, busted on any menu write.
- Admin CRUD for categories and items, drag-to-reorder, availability toggle, variants and add-on groups with min/max validated by zod.
- POST /admin/uploads (admin only): multer memory, 5 MB cap, MIME sniff, sharp -> WebP at 320/640/1280 into UPLOAD_DIR/menu/, return URLs. Nginx will serve /uploads with long-lived cache headers.
- Audit log on every price change.
- Admin UI mobile-friendly: item form with variant and add-on group editors, image preview.
Tests: time-window filtering, add-on rules, audit entry on price change.
```

## Session 3 — Storefront and cart

```
Customer storefront in the (store) route group.
- Menu page server-rendered from GET /menu (revalidate 60 s): sticky category tabs, search, veg-only toggle, veg/non-veg marks, tags, out-of-stock greyed, banners for "paused" and "closed, opens at X".
- Item sheet for variants and add-ons enforcing min/max.
- Cart in Zustand persisted to localStorage; line identity = item + variant + sorted add-ons.
- Implement packages/shared/pricing.ts now: subtotal, packaging, delivery fee by slab, coupon discount, GST, round-off, all in paise. Unit-test every rule.
- OG tags + JSON-LD (Restaurant, Menu) for Google and WhatsApp previews.
- PWA: manifest, icons, service worker caching menu images; after the first order, a banner offering the customer app (hidden until the store links are set).
Done when: Lighthouse mobile scores >= 90 for performance and accessibility on the menu page.
```

## Session 4 — Checkout and payments

```
Checkout and Razorpay. This is money: write the tests first.
- Address step: Google Places Autocomplete + draggable pin + house/flat + landmark; save to user. Haversine zone check against outlet feeSlabs; out of zone -> offer pickup.
- POST /cart/quote {items, addressId|pickup, couponCode}: return the full pricing breakdown and any unavailable items, computed with pricing.ts. The Flutter app shows only what this returns.
- POST /orders {items, addressId|pickup, couponCode, paymentMethod, idempotencyKey}: re-read every item/variant/add-on from DB, reject unavailable ones with a clear diff, recompute with pricing.ts, validate coupon, snapshot items/prices/address, daily orderNo via atomic counter. Same idempotencyKey returns the same order. Coupon usage increments in the same Mongo transaction.
- Online: create a Razorpay order for the exact total, status pending_payment, enqueue the expire job at 15 min. The response carries what both web Checkout and the razorpay_flutter SDK need.
- POST /payments/verify: signature check, mark paid if not already.
- POST /webhooks/razorpay: raw-body signature check; handle payment.captured, payment.failed, refund.processed; idempotent per event id. Capture after expiry -> auto-refund.
- COD only if phone verified, total <= codMax, user.codDisabled false.
Tests: tampered prices rejected, quote equals order total, idempotent create, webhook replay, late-capture refund, coupon limits under concurrent orders.
```

## Session 5 — Order lifecycle and realtime (API)

```
Order state machine + realtime. API only: the kitchen UI is built in the Partner app (sessions 9-10). Delete the placeholder (kitchen) and (rider) route groups in apps/web.
- orders.transition(orderId, to, actor, meta): validate against ALLOWED_TRANSITIONS and role rules (staff: accept/reject/ready/collected; rider: out_for_delivery/delivered/not_delivered; admin: cancel), append statusHistory, emit socket events, enqueue notifications. Nothing else writes order.status.
- Staff endpoints: GET /staff/orders?status=, POST /staff/orders/:id/accept {prepMinutes} (also generates the 4-digit deliveryOtp), /reject {reason}, /ready, /collected. Reject and cancel refund paid orders. PATCH /staff/menu-items/:id/availability, PATCH /staff/outlet/accepting.
- Socket.io with the Redis adapter, token auth at handshake, rooms outlet:<id>, order:<id>, rider:<id>; the server only emits.
- Every new order also goes to all active staff devices as a high-priority FCM data message (firebase-admin) with type NEW_ORDER and the orderId.
- BullMQ escalate job: WhatsApp the owner at 2 min and 5 min if still unaccepted; cancelled on accept.
Tests: every allowed and forbidden transition, refund on reject of a paid order, FCM fan-out on a new order, escalation scheduling and cancellation.
```

> **Cancel rules (decided before Session 1, already in `packages/shared`):** use `canCancel()` / `CANCELLABLE_BY` for who may cancel, not only "admin: cancel" above. From `placed`, the customer or an admin may cancel (the customer needs a cancel endpoint); from `preparing` or `ready`, staff or admin may; nobody may cancel from `pending_payment`, `out_for_delivery` or a terminal state. Moving to any status in `AUTO_REFUND_STATUSES` refunds a paid order.

## Session 6 — Rider API and tracking page

```
Rider API and the web tracking page. The rider UI is built in the Partner app (session 11).
- POST /staff/orders/:id/assign {riderId} for ready delivery orders; the rider gets a socket event + FCM push.
- Rider endpoints: GET /rider/orders (own orders only), POST /rider/orders/:id/picked-up -> out_for_delivery, POST /rider/orders/:id/delivered {otp, codCollected?} (wrong OTP rejected, 5 tries), POST /rider/orders/:id/not-delivered {reason}.
- POST /rider/location {orderId, lat, lng, at}: only for the rider's assigned out_for_delivery order; write to Redis (30-min TTL) and emit to order:<id>. Rate-limit to 1 per 5 s.
- Web tracking page /track/[orderNo]: status timeline, ETA (prep + distance estimate), live rider marker, call rider, support WhatsApp link, the delivery OTP. Guests open it via a signed link.
Tests: OTP check on delivery, riders see only their own orders, location rejected for unassigned orders, location TTL.
```

## Session 7 — Notifications, push and account

```
Notifications, push and the customer account.
- sendTemplate(phone, template, params) over the WhatsApp Business API, run in the notifications queue with 3 retries and backoff; log every send. Templates: otp, order_confirmed, order_accepted, out_for_delivery, delivered, order_rejected, order_cancelled. Names in config.
- sendPush(userId, payload) via firebase-admin to the user's devices; drop tokens FCM reports as invalid. Customer order updates go by push when the user has the app, by WhatsApp otherwise.
- Nightly 23:30 IST job: sales summary to the owner.
- Web /account: order history, reorder (flags changed prices and unavailable items), saved addresses, delete account (anonymise orders, remove PII). Expose the same as API endpoints for the app.
- Rating after delivery (1-5 + comment); <= 2 stars alerts the owner on WhatsApp.
- Marketing opt-in checkbox at first login, stored with a timestamp.
```

## Session 8 — Admin

```
Finish the admin panel.
- Dashboard: today's orders and revenue, median accept time, median delivery time, live orders.
- Settings: weekly hours, holidays, pause, fee slabs, min order, free-delivery threshold, packaging, GST rate + GSTIN, FSSAI number, codMax.
- Coupons CRUD with usage stats; staff and rider accounts by phone + role.
- Customers: search, order count, last order, block, disable COD, CSV export.
- Orders: filters, detail with history timeline, cancel + refund.
- Reports with date range + CSV: daily sales, item-wise, payment-mode split, cancellations with reasons (Mongo aggregation; confirm indexes are used).
- Editable legal pages: Terms, Privacy, Refund & Cancellation, Delivery, Contact.
```

## Session 9 — Partner app foundation

```
Create apps/partner_app: Flutter (latest stable), Android only. Read docs/BLUEPRINT.md 'Flutter apps' first.
- Riverpod, go_router, Dio with an auth interceptor (access token in memory, refresh token in flutter_secure_storage, header X-Client: app, one retry on 401).
- Generate freezed models + a typed client from the API's /openapi.json; add one script/make target to regenerate.
- Phone OTP login; route by role: staff -> kitchen home, rider -> rider home, anyone else -> not authorised.
- firebase_messaging + flutter_local_notifications: register the token via POST /me/devices; create an 'orders' channel with max importance and a bundled loud alarm sound; handle messages in foreground, background and terminated states.
- socket_io_client service with token auth, auto-reconnect and a visible offline banner; refetch open orders on reconnect.
- Sentry for Flutter; flavors dev/staging/prod pointing at the right API and Firebase project.
Done when: a staff login on a real Android device gets a test FCM push with the alarm sound while the app is closed.
```

## Session 10 — Partner app: kitchen

```
Kitchen screens in apps/partner_app (staff role), landscape tablet layout first.
- Board with New / Preparing / Ready columns from GET /staff/orders, kept live by socket events.
- NEW_ORDER push or socket event: the alarm repeats until the order is accepted or rejected; tapping the notification opens that order. wakelock_plus keeps the screen on while the kitchen view is open.
- Order card: items with variants and add-ons, notes, payment mode; accept with prep-time chips (10/20/30/45 min), reject with a reason list, mark ready, mark collected for pickup, assign a rider for delivery.
- Print KOT and bill on an 80 mm Bluetooth thermal printer (ESC/POS); printer picked once in settings.
- Quick out-of-stock toggles and a pause-online-orders switch.
- Settings screen telling staff to turn off battery optimisation for the app, with a button that opens the system setting.
Done when: on a real tablet with the screen off, a test order rings within 5 seconds.
```

## Session 11 — Partner app: rider

```
Rider screens in apps/partner_app (rider role), phone layout.
- Assigned orders (GET /rider/orders) with address, landmark and distance; push + socket on a new assignment.
- Order screen: Navigate (Google Maps intent to the pin), call customer, Picked up, then Delivered with a 4-digit OTP pad and the COD amount for COD orders; Couldn't deliver with reasons.
- Location: geolocator with an Android foreground service and a persistent 'Delivering order' notification; POST /rider/location every 10 s only while an order is out_for_delivery; stop the service on delivered or not delivered.
- A clear reason screen before asking for location permission; handle denied and while-in-use-only.
- Offline: queue the delivered call and retry; never lose a completed delivery.
Done when: with the phone locked for 5 minutes during a test delivery, the customer tracking page keeps moving.
```

## Session 12 — Hardening, GCP deploy and launch

```
Production hardening, GCP deploy and launch of the website + Partner app.
- Security pass: list any route without zod validation, OpenAPI registration or a role guard and fix it; CORS to the prod domain; rate limits on /auth, /orders, /rider/location; no secrets in client bundles or app builds; indexes per BLUEPRINT.
- Sentry releases + source maps (web, API) and debug symbols (Flutter); tag user id, never phone.
- k6 load test on staging: 50 concurrent checkouts, 200 menu views/s; report p95 and fix anything over 500 ms.
- Deploy script for one GCP Compute Engine VM (e2-standard-2, asia-south1, Ubuntu LTS, static IP): Nginx (/ -> web, /api -> api, socket.io upgrade, /uploads static), PM2 (web, api, worker), Redis, certbot, ufw, fail2ban. GCP firewall: 80/443 open, SSH only via IAP or the office IP.
- Nightly cron: tar UPLOAD_DIR to a Cloud Storage bucket, keep 14 days.
- Partner app: signed release APK (prod flavor), versioned, with a download page behind admin login for staff devices.
- docs/RUNBOOK.md: deploy, rollback, rotate keys, restore uploads, install the Partner app on a new tablet, and the 'kitchen says orders aren't coming' checklist.
- Go-live checklist: Razorpay live keys + webhook URL, WhatsApp templates approved, Firebase prod project, Maps keys restricted per platform with quota caps, Hostinger DNS A records.
```

## Session 13 — Customer app: menu and cart

```
Create apps/customer_app: Flutter (latest stable), Android + iOS. Reuse the generated API client and auth interceptor from partner_app; move shared Dart code into packages/dart_core if that removes duplication.
- Menu home from GET /menu: category tabs, search, veg-only toggle, veg/non-veg marks, out-of-stock greyed, paused/closed banners; cached images.
- Item sheet with variants and add-ons enforcing min/max; cart persisted locally; totals always from POST /cart/quote, never computed in Dart.
- Phone OTP login only at checkout; push token registered after login.
- Large tap targets; must work on a 360 dp wide Android phone.
Done when: the app's quote matches the website's total for the same cart, including coupon and delivery fee.
```

## Session 14 — Customer app: checkout and tracking

```
Checkout, payment, tracking and account in apps/customer_app.
- Address: google_maps_flutter pin with Places search, house/flat + landmark, saved addresses; zone check via /cart/quote; out of zone offers pickup.
- Pay with razorpay_flutter (UPI apps first) or COD under the same rules as web; handle cancel, failure and the app being killed mid-payment by checking order status on resume.
- Tracking screen: status timeline, ETA, live rider marker via socket, call rider, delivery OTP; opens from the order push.
- Account: order history, reorder, saved addresses, rating after delivery, marketing opt-in, delete account (both stores require it).
Tests: widget tests for cart and checkout states; an integration test that places a COD order against staging.
```

## Session 15 — Store release

```
Prepare apps/customer_app for the Play Store and App Store, under the restaurant's own developer accounts.
- App icon, splash and store screenshots from Jaskaran's assets; app name and descriptions from the client.
- Android: Play App Signing, current required target API level, Data safety answers written to docs/store/android.md.
- iOS: push capability, location usage strings, privacy manifest, App Privacy answers in docs/store/ios.md; TestFlight build.
- Privacy policy and account-deletion URLs from the website.
- Reviewer login: one test phone number with a fixed OTP, set by env on the server, logged on every use, removable after approval.
- docs/store/README.md: the release checklist and review notes.
```
