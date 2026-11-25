# Restaurant Delivery Web App — PRD, Blueprint & Build Prompts

Nov 24, 2026 · @Gaurav

> Source export. PRD.md, BLUEPRINT.md and SESSIONS.md are generated from this file; edit here first, then regenerate.

## Summary

We build one restaurant (or chain) its own branded ordering and delivery web app. Customers order direct instead of through Zomato/Swiggy, so the restaurant keeps the aggregator commission and owns its customer list. Target: website and staff app live about 7 weeks after the menu data and Razorpay KYC are in hand; the customer app reaches the Play Store and App Store about 2 weeks after that.

The calls made in this doc:

- Fresh build, not a VakhraMart fork. We lift patterns (Razorpay webhooks, Socket.io, BullMQ) but not the codebase. VakhraMart is multi-store grocery with POS sync and Route splits. A single restaurant needs none of that, and it needs menu variants and add-ons that VakhraMart lacks.
- Next.js App Router + Express API + MongoDB on GCP. The Next app serves the ordering website and the admin. The menu is server-rendered so it shows up in Google results and in WhatsApp link previews.
- Flutter for every app. A customer app for Android and iOS, plus one Partner app for the kitchen and riders, where native push and background location fix what a browser can't. The website stays on Next.js so it opens fast on 4G and Google can read the menu.
- Money lands directly in the restaurant's own Razorpay account. Adsol never holds funds.
- Phone OTP login over WhatsApp, with COD guarded by a value cap and a per-customer kill switch.
- Multi-outlet ready in the schema only. outletId goes on every document, but there's no SaaS build. AnyImmi's launch comes first.

The real risk is demand, not tech. A direct-order site gets zero orders unless the restaurant actively moves customers over. Sell the build with a launch push: a QR code in every bag and on every bill, a first-order coupon, a WhatsApp broadcast and Meta ads.

## PRD

The restaurant pays commission on every aggregator order, never sees who its customers are and can't remarket to them. v1 gives it a direct channel that is as fast to order from as Zomato and that the kitchen can't miss.

### Goals

1. A customer goes from link to placed order in under 90 seconds on a mid-range Android phone on 4G.
2. No order is missed. Every new order sounds an alarm in the kitchen, and the owner gets a WhatsApp if it isn't accepted within 2 minutes.
3. Direct orders reach a share of total orders agreed with the client, measured at 90 days.

### Roles

| Role          | Device                                             | Does                                                                           |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Customer      | Website, or the Flutter customer app (Android/iOS) | Browses, orders, pays, tracks, rates                                           |
| Kitchen staff | Android tablet at the counter, Partner app         | Accepts or rejects, prints KOT, marks ready, toggles stock                     |
| Rider         | Own Android phone, Partner app                     | Picks up, navigates, shares location, closes the order with the customer's OTP |
| Owner / admin | Laptop or phone, web admin                         | Menu, pricing, zones, coupons, staff, refunds, reports                         |

### v1 scope

#### Customer storefront

- Menu by category, with search, a veg-only toggle and veg/non-veg marks; out-of-stock items greyed out
- Variants (half/full, sizes) and add-on groups with min/max rules
- Cart persists across visits; minimum order and delivery fee shown before checkout
- Phone OTP login at checkout only, not before browsing
- Address by map pin plus house/flat and landmark fields; saved addresses
- Zone check on pin drop; out-of-zone customers are offered pickup
- Delivery or pickup order types
- UPI/card via Razorpay, or COD; coupon at checkout
- Live tracking: status timeline, ETA, rider on the map when out for delivery, a call-rider button
- Cancel until the kitchen accepts; order history, one-tap reorder, rating after delivery
- The same features in the Flutter customer app, plus push notifications for order updates; English first, with strings ready for Punjabi in v1.1

#### Kitchen (Partner app, Android tablet)

- Live board (New / Preparing / Ready) with a loud alarm that rings until the order is accepted, even with the screen off or the app closed
- Accept with a prep time (10/20/30/45 min) or reject with a reason
- Print KOT and bill on an 80 mm Bluetooth thermal printer
- Quick out-of-stock toggles; pause online orders when the kitchen is slammed

#### Rider (Partner app, Android phone)

- Assigned orders, address and landmark, one-tap Google Maps navigation, call customer
- Shares live location while a delivery is active, even with the phone locked
- Closes the order with the customer's 4-digit OTP and records COD collected

#### Admin (web)

- Menu, categories, variants, add-ons and photos
- Hours, holidays, delivery fee slabs, minimum order, packaging charge, GST, COD cap
- Coupons, staff and rider accounts, customer list with CSV export
- Reports: daily sales, item-wise sales, payment-mode split, cancellations
- Cancel and refund; edit the legal pages

### Not in v1

- Scheduled orders (v1.1); an iOS build of the Partner app
- Dine-in QR ordering (v2, a cheap add and a good upsell)
- Loyalty points, table reservations, multi-outlet UI
- POS integration and Zomato/Swiggy menu sync
- Third-party rider APIs such as Porter or Shadowfax (v2, if their own riders can't keep up)

### Success metrics (proposed, to agree with the client)

| Metric                                   | Target   |
| ---------------------------------------- | -------- |
| Cart → placed order                      | ≥ 30%    |
| Median time to accept                    | < 60 s   |
| Missed orders (never accepted)           | 0        |
| Median order-to-door                     | ≤ 40 min |
| Customers who order again within 30 days | ≥ 25%    |

### Open questions for the client

Kirandeep collects these in the onboarding call. The first four change the build; the rest are setup.

- [ ] Own riders or not? How many, and do they all have Android smartphones?
- [ ] Existing POS or billing software (Petpooja etc.)? Does online billing have to land in it?
- [ ] Delivery radius and the fee they charge today; is COD a must, and up to what amount?
- [ ] Outlets today, and is a second one planned in the next 12 months?
- [ ] Menu sheet: items, variants, add-ons, prices; photos available, or does Jaskaran need a shoot?
- [ ] GSTIN, FSSAI licence number; regular GST or composition?
- [ ] A current account and documents for Razorpay KYC in the restaurant's name
- [ ] WhatsApp Business number for order updates (it can't be the one they chat on from the app)
- [ ] Domain: do they own one, or do we buy it?
- [ ] Opening hours, last-order cut-off, and orders per day at peak
- [ ] Google Play and Apple developer accounts in the restaurant's own name. Both need a D-U-N-S number, which can take weeks, so start on day one
- [ ] An Android tablet for the counter and a Bluetooth 80 mm thermal printer

## Technical blueprint

One Next.js website, two Flutter apps, one Express API and one BullMQ worker. The server side runs on a single GCP Compute Engine VM in Mumbai, with MongoDB Atlas in the same region; that comfortably carries one restaurant's peak.

| Layer           | Choice                                                                                                   | Why                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Language        | TypeScript (strict), ESM                                                                                 | The price calculator and order-status rules are shared by web and API; types stop them drifting apart                    |
| Web             | Next.js App Router + Tailwind                                                                            | SSR menu for Google and WhatsApp previews; serves the ordering website and the admin                                     |
| API             | Express 5 + Mongoose + zod                                                                               | Socket.io and BullMQ need a long-running process; your comfort zone                                                      |
| Database        | MongoDB Atlas, Mumbai region                                                                             | Menu items with nested variants and order snapshots are natural documents; managed backups                               |
| Queue / cache   | Redis + BullMQ, separate worker process                                                                  | Payment expiry, escalations and WhatsApp retries can't live in request handlers                                          |
| Realtime        | Socket.io + Redis adapter                                                                                | Kitchen board, tracking and rider location; the adapter makes a second API process a config change                       |
| Auth            | Custom JWT: 15-min access + 30-day rotating refresh (httpOnly cookie on web, secure storage in the apps) | Phone OTP only, no passwords                                                                                             |
| OTP and updates | WhatsApp Business API; MSG91 SMS fallback for OTP only                                                   | You already run WhatsApp; customers read it, not SMS                                                                     |
| Maps            | Google Places Autocomplete + Maps JS                                                                     | Pin drop beats typed addresses in Punjab towns; zone check is haversine, so there's no per-checkout Distance Matrix bill |
| Payments        | Razorpay Standard Checkout, webhooks, Refunds API                                                        | UPI-first; refunds automated                                                                                             |
| Images          | Local upload, sharp → WebP at 3 widths, served by Nginx                                                  | Your default; no Cloudinary bill                                                                                         |
| Monitoring      | Sentry (web, API and both apps) + an uptime ping on /health                                              |                                                                                                                          |

### Flutter apps

- Two apps, apps/customer_app (Android + iOS) and apps/partner_app (Android; kitchen or rider by login role), on the latest stable Flutter, outside the pnpm workspace.
- Riverpod, go_router and Dio, with freezed models generated from the API's OpenAPI spec so the Dart types can't drift from the zod schemas.
- The apps never compute prices: they call POST /cart/quote and show what the server returns.
- Push is Firebase Cloud Messaging. The Partner app gets high-priority data messages on its own alarm-sound channel; Socket.io carries live updates while an app is open.
- Maps: google_maps_flutter for the address pin and the rider marker; geolocator with an Android foreground service for rider location during a delivery.
- Payments: razorpay_flutter, same server flow as the website. Food is a physical good, so Apple's in-app purchase rules don't apply.
- Distribution: customer app on the Play Store and App Store; Partner app as a private APK on staff devices, with no store listing.

### Repo layout

```
restaurant-app/
  apps/
    web/                 Next.js App Router
      app/(store)/       menu, cart, checkout, track, account
      app/(admin)/admin/
    api/                 Express 5
      src/modules/       auth, menu, orders, payments, delivery,
                         coupons, riders, reports, settings, notifications
      src/jobs/          BullMQ processors (run by worker.ts)
      src/sockets/
    customer_app/        Flutter, Android + iOS
    partner_app/         Flutter, Android: kitchen + rider by role
  packages/
    shared/              zod schemas, ORDER_STATUS + transitions, pricing.ts
  docs/                  PRD.md, BLUEPRINT.md, RUNBOOK.md
  ecosystem.config.cjs   PM2: web, api, worker
```

packages/shared/pricing.ts is the only place a total is computed. The cart uses it for display, and the API uses it as the authority. The Flutter apps get their totals from POST /cart/quote instead. A total sent by any client is never trusted.

### Deployment

- A GCP project for this client, separate from AnyImmi's, with a budget alert.
- One Compute Engine VM, e2-standard-2 in asia-south1 (Mumbai), running Ubuntu LTS with a static IP, Nginx, PM2, Redis and Let's Encrypt. Not Cloud Run: Socket.io and the BullMQ worker need always-on processes, and Cloud Run would add minimum instances, sticky sessions and managed Redis for no gain at this size.
- MongoDB Atlas on GCP, in the Mumbai region.
- Nginx serves the website on /, the API on /api, the Socket.io upgrade, and /uploads as static files. One domain means no CORS or cookie headaches.
- Hostinger keeps the DNS (A records to the VM's static IP).
- Staging is a second small VM with Razorpay test keys and a staging Firebase project.
- Backups: Atlas daily snapshots, plus a nightly tar of /uploads to a Cloud Storage bucket, kept 14 days.
- Maps keys, one per platform: the web key is locked to the domain, the Android keys to package name + SHA-1, the iOS key to the bundle ID, and a server key (only if the API geocodes) to the VM's IP. Enable only the APIs in use, each with a daily quota cap.

### Data model

Eight collections. Orders snapshot every item, price and the address at placement, so later menu edits never change a past order or its invoice.

| Collection  | Key fields                                                                                                                                                                                                                                                                                                                                                                      | Notes                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| outlets     | name, address, geo (Point), phone, hours[], holidays[], acceptingOrders, feeSlabs[{upToKm, fee}], minOrder, freeDeliveryAbove, packagingCharge, gst {gstin, rate}, fssaiNo, codMax                                                                                                                                                                                              | One document in v1; outletId everywhere keeps multi-outlet open |
| categories  | outletId, name, sortOrder, timeWindows[], isActive                                                                                                                                                                                                                                                                                                                              | Time windows allow a breakfast-only category                    |
| menuItems   | outletId, categoryId, name, description, images{320,640,1280}, isVeg, basePrice, variants[{name, price}], addonGroups[{name, min, max, options[{name, price, isVeg}]}], isAvailable, tags[], sortOrder                                                                                                                                                                          | Prices in paise (integers) everywhere                           |
| users       | phone (unique), name, role (customer, staff, rider, admin), addresses[{label, line, landmark, geo, isDefault}], codDisabled, isBlocked, marketingOptIn {at}, devices[{fcmToken, app, platform, lastSeenAt}]                                                                                                                                                                     | One collection for all roles                                    |
| orders      | orderNo, outletId, customerId, type (delivery, pickup), items[] snapshot, pricing {subtotal, discount, packaging, deliveryFee, tax, roundOff, total}, address snapshot, payment {method, status, razorpayOrderId, razorpayPaymentId, refundId}, status, statusHistory[{status, at, by, reason}], prepMinutes, riderId, deliveryOtp, couponCode, rating, idempotencyKey (unique) | Payment status is a separate field from order status            |
| coupons     | code, type (flat, percent), value, maxDiscount, minOrder, firstOrderOnly, perUserLimit, totalLimit, usedCount, validFrom, validTo                                                                                                                                                                                                                                               | Usage incremented in the same transaction as order creation     |
| otpSessions | phone, codeHash, attempts, sendsInWindow, expiresAt                                                                                                                                                                                                                                                                                                                             | TTL index on expiresAt                                          |
| auditLogs   | actor, action, entity, before, after, at                                                                                                                                                                                                                                                                                                                                        | Price changes, refunds, coupon edits, cancellations             |

Live rider location lives only in Redis (one key per active order, 30-min TTL). Writing it to Mongo every 10 seconds buys nothing.

Indexes: orders {outletId, createdAt}, {customerId, createdAt}, {status, createdAt}; menuItems {outletId, categoryId, sortOrder}; users phone unique; coupons code unique.

### Order lifecycle

Before the kitchen accepts, the customer or an admin can also cancel a placed order, with an automatic refund; after that, staff or an admin can cancel from preparing or ready, with a reason and the same refund. In code the accepted state is named preparing. Payment status (pending, paid, refunded) is a separate field, so a refund never hides where the order stopped. Clients only request a move; orders.transition() checks it against this map and the caller's role.

### Payments, delivery, realtime and security

The Razorpay webhook decides whether an order is paid. Only the server's transition function changes an order's status. Everything below follows from those two rules.

#### Payments

1. Checkout sends the cart, the address, the payment method and an idempotency key. The API re-reads every item from the database and recomputes the total with pricing.ts.
2. For online payment, the API creates the order as pending_payment plus a Razorpay order for the exact amount in paise. The client then opens Razorpay Checkout.
3. The client's success handler calls /payments/verify (fast path). The payment.captured webhook is the source of truth, and both paths are idempotent.
4. A job expires unpaid orders after 15 minutes. If a capture arrives after expiry, it is refunded automatically.
5. A reject or cancel on a paid order calls the Refunds API, and the refund.processed webhook closes it out.

COD requires a verified phone and a total under the outlet's codMax. Admin can switch COD off for a customer after one fake order.

#### Delivery zones and fees

- The zone check is the straight-line (haversine) distance from the outlet to the customer's pin, matched against fee slabs, for example 0–3 km and 3–6 km. Beyond the last slab, the customer gets pickup only.
- Road distance runs longer than straight-line, so set the slabs a little tighter than the real riding radius. Switch to road distance in v2 only if fee disputes show up.
- ETA shown = the accepted prep time + a per-km riding estimate.

#### Realtime and background jobs

- Socket.io rooms: outlet:<id> (kitchen and admin), order:<id> (customer tracking), rider:<id>. Sockets authenticate at handshake. The server only emits; all changes go through REST.
- Rider location: the Partner app sends its position every 10 s during an active delivery, from a foreground service so it keeps going with the phone locked. It goes to Redis (30-min TTL) and is emitted to the order's room.
- BullMQ queues, run by a separate worker process:
  - payments: expire unpaid orders at 15 min
  - escalations: WhatsApp the owner if an order isn't accepted by 2 min, and again at 5 min
  - notifications: WhatsApp sends with retry
  - reports: nightly sales summary to the owner

#### Kitchen alert reliability

This is the feature that loses or keeps the client.

- Every new order goes out twice: a Socket.io event for the open app, and a high-priority FCM message that wakes the tablet when the app is in the background or the screen is off.
- The Partner app plays it on its own notification channel with a loud alarm that repeats until someone accepts, and keeps the screen awake on the kitchen view.
- The tablet stays plugged in, with battery optimisation turned off for the Partner app; Kirandeep sets this at install, because otherwise Android can delay pushes.
- If the tablet or the Wi-Fi is dead, the WhatsApp escalation to the owner at 2 minutes still fires.

#### WhatsApp templates

Submit these for Meta approval in week 1, because approval can take days: OTP (authentication), order confirmed, accepted with ETA, out for delivery with the tracking link, delivered with a rating link, rejected or cancelled with a refund note.

#### Security

- OTP: 6 digits, stored hashed, 5-minute expiry, 5 attempts, 3 sends per phone per 15 minutes, plus a per-IP limit.
- Refresh tokens rotate on each use; reusing an old token revokes the whole family.
- Role guard on every route; a rider can only read orders assigned to them.
- helmet; CORS locked to the domain; zod on every request body; rate limits on /auth and /orders.
- Uploads are admin-only, capped at 5 MB, MIME-sniffed and re-encoded by sharp, which strips EXIF and anything embedded.
- The webhook verifies the Razorpay signature on the raw body.
- Audit log on price changes, refunds and coupon edits.

### Compliance flags

None of these block the build, but each needs a yes from the restaurant's CA or from Razorpay before go-live.

- GST. On its own site, the restaurant itself charges GST and issues the tax invoice; the aggregator rule that has Zomato/Swiggy pay restaurant GST does not apply here. Their CA confirms three things: the rate (usually 5% for restaurants), how the packaging charge is taxed, and, if they're on composition, that direct online sales are fine.
- FSSAI. Show the licence number on the site footer and on every bill and invoice.
- Razorpay KYC. The account is in the restaurant's name, with their PAN, GSTIN and current account. Before Razorpay activates it, the site needs live Contact, Terms, Privacy, Refund & Cancellation, and Delivery policy pages, so they ship in week 1. Funds settle straight to the restaurant. Adsol never collects and passes money on, which keeps us clear of RBI payment-aggregator rules.
- DPDP Act. Phones, addresses and order history are personal data. We need a privacy notice and consent at OTP login, an account-deletion option, and a separate opt-in before any WhatsApp marketing (Meta requires the opt-in too). The restaurant is the data fiduciary and Adsol is the processor, so Aman adds a data-processing clause to the contract.
- App stores. Publish the customer app under the restaurant's own Google Play and Apple developer accounts. Apple expects a business's app to be published by that business and often rejects restaurant apps sent from an agency's account. Both stores need a privacy policy URL, their privacy/data-safety forms, and in-app account deletion (already in scope).

## Build plan and owners

About 9 weeks. The website and Partner app go live in week 7, and the customer app follows in the stores around week 9, so store review never holds up the launch. Jatin runs the Claude Code sessions. Garry reviews only sessions 1, 4 and 5 (auth, payments, order state), the parts that cost real money if wrong, so AnyImmi keeps his focus.

| Week | Work                                                                                                                  | Sessions | Owners                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| 1    | Scaffold, auth, menu and admin menu; legal pages live; WhatsApp templates submitted; store developer accounts started | 0–2      | Jatin; Kirandeep collects menu, KYC docs, WhatsApp number, D-U-N-S and store accounts; Jaskaran preps food photos |
| 2    | Storefront, cart, checkout, payments                                                                                  | 3–4      | Jatin; Garry reviews payments                                                                                     |
| 3    | Order lifecycle API, realtime, rider API and tracking page                                                            | 5–6      | Jatin; Garry reviews the state machine                                                                            |
| 4    | Notifications and push, account, admin                                                                                | 7–8      | Jatin                                                                                                             |
| 5–6  | Partner app: foundation, kitchen, rider                                                                               | 9–11     | Jatin                                                                                                             |
| 7    | Hardening, GCP deploy, 2-day dry run with staff placing real orders; website + Partner app launch                     | 12       | Jatin; Kirandeep sets up the tablet and trains staff and riders                                                   |
| 8–9  | Customer app, then Play Store and App Store submission                                                                | 13–15    | Jatin; Jaskaran makes the store icon and screenshots                                                              |

Launch push, sold by Aman as part of the package:

- Jaskaran: QR table tents and bag inserts
- Vansh / Vivek / Jaskirat: launch reels
- Meta ads with a first-order coupon

Hosting, WhatsApp, Maps and Firebase usage go on a monthly maintenance retainer, passed through at cost plus margin.

## Claude Code session prompts

Before session 0:

1. Export this doc to Markdown.
2. Save the PRD and Compliance sections as docs/PRD.md, and the blueprint sections as docs/BLUEPRINT.md.

Run one session per prompt and /clear between sessions. Start each one in plan mode, approve the plan, then let it build. Merge only when its tests pass.

This doc changed after Session 0 started (Flutter apps, GCP). Re-export it into docs/ before Session 1; Session 0 needs nothing new. Run order: 0–8, then the Partner app (9–11), then deploy and launch (12), then the customer app (13–15).

### Session 0 — Scaffold

Read docs/PRD.md and docs/BLUEPRINT.md first. Set up the monorepo exactly as BLUEPRINT "Repo layout" describes.

- pnpm workspaces, TypeScript strict, ESM everywhere.
- apps/api: Express 5, Mongoose, zod, pino, helmet, cors, express-rate-limit, Sentry. GET /health reports Mongo and Redis status. src/worker.ts boots BullMQ processors.
- apps/web: Next.js App Router (latest stable), Tailwind, Sentry. Route groups (store), (kitchen), (rider), (admin) with placeholder pages.
- packages/shared: zod schemas, ORDER_STATUS enum + ALLOWED_TRANSITIONS map, empty pricing.ts.
- Env loader validated with zod; .env.example per app. docker-compose.yml for local Mongo + Redis only.
- ESLint, Prettier, Vitest; ecosystem.config.cjs for PM2 (web, api, worker).
- Write CLAUDE.md: commands, folder conventions, money in paise, "server recomputes all prices via shared pricing.ts", "order.status changes only through orders.transition()".
  Done when: pnpm dev runs everything, /health is green, pnpm test passes.

### Session 1 — Auth

Build phone-OTP auth in apps/api/src/modules/auth and the web login UI.

- POST /auth/otp/send {phone}: validate Indian mobile, 6-digit code, hash into otpSessions (TTL 5 min), max 3 sends per phone per 15 min + per-IP limit. Deliver via notifications.sendOtp() (WhatsApp auth template, MSG91 SMS fallback); in dev just log it.
- POST /auth/otp/verify: max 5 attempts; create user on first login; return access JWT (15 min) in the body. Refresh token (30 days): httpOnly SameSite=Lax cookie for web; in the body when the request carries header X-Client: app (the Flutter apps keep it in secure storage). Store the refresh hash with a family id, rotate on use, revoke the family on reuse.
- POST /auth/refresh (cookie or body), POST /auth/logout, GET /me, PATCH /me (name, addresses), POST /me/devices {fcmToken, app: customer|partner, platform} upserting into user.devices.
- Middleware requireAuth and requireRole('staff'|'rider'|'admin'). Seed script creates the admin from ADMIN_PHONE.
- Set up @asteasolutions/zod-to-openapi: every route registers its request and response schemas; serve GET /openapi.json. Add a CLAUDE.md rule that every new route must register.
- Web: OTP bottom sheet used at checkout; login page for /admin; fetch wrapper refreshes on 401 once.
  Tests: send limits, attempt lockout, rotation + reuse detection for both cookie and body clients, role guard.

### Session 2 — Menu and uploads

Menu module + admin menu UI (/admin/menu). Models per BLUEPRINT "Data model" (outlet seeded, category, menuItem).

- GET /menu: categories with available items, respecting outlet hours and category time windows; Redis cache 60 s, busted on any menu write.
- Admin CRUD for categories and items, drag-to-reorder, availability toggle, variants and add-on groups with min/max validated by zod.
- POST /admin/uploads (admin only): multer memory, 5 MB cap, MIME sniff, sharp -> WebP at 320/640/1280 into UPLOAD_DIR/menu/, return URLs. Nginx will serve /uploads with long-lived cache headers.
- Audit log on every price change.
- Admin UI mobile-friendly: item form with variant and add-on group editors, image preview.
  Tests: time-window filtering, add-on rules, audit entry on price change.

### Session 3 — Storefront and cart

Customer storefront in the (store) route group.

- Menu page server-rendered from GET /menu (revalidate 60 s): sticky category tabs, search, veg-only toggle, veg/non-veg marks, tags, out-of-stock greyed, banners for "paused" and "closed, opens at X".
- Item sheet for variants and add-ons enforcing min/max.
- Cart in Zustand persisted to localStorage; line identity = item + variant + sorted add-ons.
- Implement packages/shared/pricing.ts now: subtotal, packaging, delivery fee by slab, coupon discount, GST, round-off, all in paise. Unit-test every rule.
- OG tags + JSON-LD (Restaurant, Menu) for Google and WhatsApp previews.
- PWA: manifest, icons, service worker caching menu images; after the first order, a banner offering the customer app (hidden until the store links are set).
  Done when: Lighthouse mobile scores >= 90 for performance and accessibility on the menu page.

### Session 4 — Checkout and payments

Checkout and Razorpay. This is money: write the tests first.

- Address step: Google Places Autocomplete + draggable pin + house/flat + landmark; save to user. Haversine zone check against outlet feeSlabs; out of zone -> offer pickup.
- POST /cart/quote {items, addressId|pickup, couponCode}: return the full pricing breakdown and any unavailable items, computed with pricing.ts. The Flutter app shows only what this returns.
- POST /orders {items, addressId|pickup, couponCode, paymentMethod, idempotencyKey}: re-read every item/variant/add-on from DB, reject unavailable ones with a clear diff, recompute with pricing.ts, validate coupon, snapshot items/prices/address, daily orderNo via atomic counter. Same idempotencyKey returns the same order. Coupon usage increments in the same Mongo transaction.
- Online: create a Razorpay order for the exact total, status pending_payment, enqueue the expire job at 15 min. The response carries what both web Checkout and the razorpay_flutter SDK need.
- POST /payments/verify: signature check, mark paid if not already.
- POST /webhooks/razorpay: raw-body signature check; handle payment.captured, payment.failed, refund.processed; idempotent per event id. Capture after expiry -> auto-refund.
- COD only if phone verified, total <= codMax, user.codDisabled false.
  Tests: tampered prices rejected, quote equals order total, idempotent create, webhook replay, late-capture refund, coupon limits under concurrent orders.

### Session 5 — Order lifecycle and realtime (API)

Order state machine + realtime. API only: the kitchen UI is built in the Partner app (sessions 9-10). Delete the placeholder (kitchen) and (rider) route groups in apps/web.

- orders.transition(orderId, to, actor, meta): validate against ALLOWED_TRANSITIONS and role rules from canCancel() and CANCELLABLE_BY in packages/shared (customer: cancel while placed; staff: accept/reject/ready/collected, cancel from preparing or ready; rider: out_for_delivery/delivered/not_delivered; admin: cancel from placed, preparing or ready), append statusHistory, emit socket events, enqueue notifications. Nothing else writes order.status.
- Staff endpoints: GET /staff/orders?status=, POST /staff/orders/:id/accept {prepMinutes} (also generates the 4-digit deliveryOtp), /reject {reason}, /ready, /collected. Reject and cancel refund paid orders. POST /staff/orders/:id/cancel {reason}. Customer: POST /orders/:id/cancel, only while placed. PATCH /staff/menu-items/:id/availability, PATCH /staff/outlet/accepting.
- Socket.io with the Redis adapter, token auth at handshake, rooms outlet:<id>, order:<id>, rider:<id>; the server only emits.
- Every new order also goes to all active staff devices as a high-priority FCM data message (firebase-admin) with type NEW_ORDER and the orderId.
- BullMQ escalate job: WhatsApp the owner at 2 min and 5 min if still unaccepted; cancelled on accept.
  Tests: every allowed and forbidden transition, refund on reject of a paid order, FCM fan-out on a new order, escalation scheduling and cancellation.

### Session 6 — Rider API and tracking page

Rider API and the web tracking page. The rider UI is built in the Partner app (session 11).

- POST /staff/orders/:id/assign {riderId} for ready delivery orders; the rider gets a socket event + FCM push.
- Rider endpoints: GET /rider/orders (own orders only), POST /rider/orders/:id/picked-up -> out_for_delivery, POST /rider/orders/:id/delivered {otp, codCollected?} (wrong OTP rejected, 5 tries), POST /rider/orders/:id/not-delivered {reason}.
- POST /rider/location {orderId, lat, lng, at}: only for the rider's assigned out_for_delivery order; write to Redis (30-min TTL) and emit to order:<id>. Rate-limit to 1 per 5 s.
- Web tracking page /track/[orderNo]: status timeline, ETA (prep + distance estimate), live rider marker, call rider, support WhatsApp link, the delivery OTP. Guests open it via a signed link.
  Tests: OTP check on delivery, riders see only their own orders, location rejected for unassigned orders, location TTL.

### Session 7 — Notifications, push and account

Notifications, push and the customer account.

- sendTemplate(phone, template, params) over the WhatsApp Business API, run in the notifications queue with 3 retries and backoff; log every send. Templates: otp, order_confirmed, order_accepted, out_for_delivery, delivered, order_rejected, order_cancelled. Names in config.
- sendPush(userId, payload) via firebase-admin to the user's devices; drop tokens FCM reports as invalid. Customer order updates go by push when the user has the app, by WhatsApp otherwise.
- Nightly 23:30 IST job: sales summary to the owner.
- Web /account: order history, reorder (flags changed prices and unavailable items), saved addresses, delete account (anonymise orders, remove PII). Expose the same as API endpoints for the app.
- Rating after delivery (1-5 + comment); <= 2 stars alerts the owner on WhatsApp.
- Marketing opt-in checkbox at first login, stored with a timestamp.

### Session 8 — Admin

Finish the admin panel.

- Dashboard: today's orders and revenue, median accept time, median delivery time, live orders.
- Settings: weekly hours, holidays, pause, fee slabs, min order, free-delivery threshold, packaging, GST rate + GSTIN, FSSAI number, codMax.
- Coupons CRUD with usage stats; staff and rider accounts by phone + role.
- Customers: search, order count, last order, block, disable COD, CSV export.
- Orders: filters, detail with history timeline, cancel + refund.
- Reports with date range + CSV: daily sales, item-wise, payment-mode split, cancellations with reasons (Mongo aggregation; confirm indexes are used).
- Editable legal pages: Terms, Privacy, Refund & Cancellation, Delivery, Contact.

### Session 9 — Partner app foundation

Create apps/partner_app: Flutter (latest stable), Android only. Read docs/BLUEPRINT.md 'Flutter apps' first.

- Riverpod, go_router, Dio with an auth interceptor (access token in memory, refresh token in flutter_secure_storage, header X-Client: app, one retry on 401).
- Generate freezed models + a typed client from the API's /openapi.json; add one script/make target to regenerate.
- Phone OTP login; route by role: staff -> kitchen home, rider -> rider home, anyone else -> not authorised.
- firebase_messaging + flutter_local_notifications: register the token via POST /me/devices; create an 'orders' channel with max importance and a bundled loud alarm sound; handle messages in foreground, background and terminated states.
- socket_io_client service with token auth, auto-reconnect and a visible offline banner; refetch open orders on reconnect.
- Sentry for Flutter; flavors dev/staging/prod pointing at the right API and Firebase project.
  Done when: a staff login on a real Android device gets a test FCM push with the alarm sound while the app is closed.

### Session 10 — Partner app: kitchen

Kitchen screens in apps/partner_app (staff role), landscape tablet layout first.

- Board with New / Preparing / Ready columns from GET /staff/orders, kept live by socket events.
- NEW_ORDER push or socket event: the alarm repeats until the order is accepted or rejected; tapping the notification opens that order. wakelock_plus keeps the screen on while the kitchen view is open.
- Order card: items with variants and add-ons, notes, payment mode; accept with prep-time chips (10/20/30/45 min), reject with a reason list, mark ready, mark collected for pickup, assign a rider for delivery.
- Print KOT and bill on an 80 mm Bluetooth thermal printer (ESC/POS); printer picked once in settings.
- Quick out-of-stock toggles and a pause-online-orders switch.
- Settings screen telling staff to turn off battery optimisation for the app, with a button that opens the system setting.
  Done when: on a real tablet with the screen off, a test order rings within 5 seconds.

### Session 11 — Partner app: rider

Rider screens in apps/partner_app (rider role), phone layout.

- Assigned orders (GET /rider/orders) with address, landmark and distance; push + socket on a new assignment.
- Order screen: Navigate (Google Maps intent to the pin), call customer, Picked up, then Delivered with a 4-digit OTP pad and the COD amount for COD orders; Couldn't deliver with reasons.
- Location: geolocator with an Android foreground service and a persistent 'Delivering order' notification; POST /rider/location every 10 s only while an order is out_for_delivery; stop the service on delivered or not delivered.
- A clear reason screen before asking for location permission; handle denied and while-in-use-only.
- Offline: queue the delivered call and retry; never lose a completed delivery.
  Done when: with the phone locked for 5 minutes during a test delivery, the customer tracking page keeps moving.

### Session 12 — Hardening, GCP deploy and launch

Production hardening, GCP deploy and launch of the website + Partner app.

- Security pass: list any route without zod validation, OpenAPI registration or a role guard and fix it; CORS to the prod domain; rate limits on /auth, /orders, /rider/location; no secrets in client bundles or app builds; indexes per BLUEPRINT.
- Sentry releases + source maps (web, API) and debug symbols (Flutter); tag user id, never phone.
- k6 load test on staging: 50 concurrent checkouts, 200 menu views/s; report p95 and fix anything over 500 ms.
- Deploy script for one GCP Compute Engine VM (e2-standard-2, asia-south1, Ubuntu LTS, static IP): Nginx (/ -> web, /api -> api, socket.io upgrade, /uploads static), PM2 (web, api, worker), Redis, certbot, ufw, fail2ban. GCP firewall: 80/443 open, SSH only via IAP or the office IP.
- Nightly cron: tar UPLOAD_DIR to a Cloud Storage bucket, keep 14 days.
- Partner app: signed release APK (prod flavor), versioned, with a download page behind admin login for staff devices.
- docs/RUNBOOK.md: deploy, rollback, rotate keys, restore uploads, install the Partner app on a new tablet, and the 'kitchen says orders aren't coming' checklist.
- Go-live checklist: Razorpay live keys + webhook URL, WhatsApp templates approved, Firebase prod project, Maps keys restricted per platform with quota caps, Hostinger DNS A records.

### Session 13 — Customer app: menu and cart

Create apps/customer_app: Flutter (latest stable), Android + iOS. Reuse the generated API client and auth interceptor from partner_app; move shared Dart code into packages/dart_core if that removes duplication.

- Menu home from GET /menu: category tabs, search, veg-only toggle, veg/non-veg marks, out-of-stock greyed, paused/closed banners; cached images.
- Item sheet with variants and add-ons enforcing min/max; cart persisted locally; totals always from POST /cart/quote, never computed in Dart.
- Phone OTP login only at checkout; push token registered after login.
- Large tap targets; must work on a 360 dp wide Android phone.
  Done when: the app's quote matches the website's total for the same cart, including coupon and delivery fee.

### Session 14 — Customer app: checkout and tracking

Checkout, payment, tracking and account in apps/customer_app.

- Address: google_maps_flutter pin with Places search, house/flat + landmark, saved addresses; zone check via /cart/quote; out of zone offers pickup.
- Pay with razorpay_flutter (UPI apps first) or COD under the same rules as web; handle cancel, failure and the app being killed mid-payment by checking order status on resume.
- Tracking screen: status timeline, ETA, live rider marker via socket, call rider, delivery OTP; opens from the order push.
- Account: order history, reorder, saved addresses, rating after delivery, marketing opt-in, delete account (both stores require it).
  Tests: widget tests for cart and checkout states; an integration test that places a COD order against staging.

### Session 15 — Store release

Prepare apps/customer_app for the Play Store and App Store, under the restaurant's own developer accounts.

- App icon, splash and store screenshots from Jaskaran's assets; app name and descriptions from the client.
- Android: Play App Signing, current required target API level, Data safety answers written to docs/store/android.md.
- iOS: push capability, location usage strings, privacy manifest, App Privacy answers in docs/store/ios.md; TestFlight build.
- Privacy policy and account-deletion URLs from the website.
- Reviewer login: one test phone number with a fixed OTP, set by env on the server, logged on every use, removable after approval.
- docs/store/README.md: the release checklist and review notes.
