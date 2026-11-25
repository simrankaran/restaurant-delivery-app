# Restaurant Delivery Web App — PRD

Nov 24, 2026 · @Gaurav · generated from `docs/source.md`

## Summary

We build one restaurant (or chain) its own branded ordering and delivery web app. Customers order direct instead of through Zomato/Swiggy, so the restaurant keeps the aggregator commission and owns its customer list. Target: website and staff app live about 7 weeks after the menu data and Razorpay KYC are in hand; the customer app reaches the Play Store and App Store about 2 weeks after that.

The calls made in this doc:

- **Fresh build, not a VakhraMart fork.** We lift patterns (Razorpay webhooks, Socket.io, BullMQ) but not the codebase. VakhraMart is multi-store grocery with POS sync and Route splits. A single restaurant needs none of that, and it needs menu variants and add-ons that VakhraMart lacks.
- **Next.js App Router + Express API + MongoDB on GCP.** The Next app serves the ordering website and the admin. The menu is server-rendered so it shows up in Google results and in WhatsApp link previews.
- **Flutter for every app.** A customer app for Android and iOS, plus one Partner app for the kitchen and riders, where native push and background location fix what a browser can't. The website stays on Next.js so it opens fast on 4G and Google can read the menu.
- **Money lands directly in the restaurant's own Razorpay account.** Adsol never holds funds.
- **Phone OTP login over WhatsApp, with COD guarded** by a value cap and a per-customer kill switch.
- **Multi-outlet ready in the schema only.** `outletId` goes on every document, but there's no SaaS build. AnyImmi's launch comes first.

The real risk is demand, not tech. A direct-order site gets zero orders unless the restaurant actively moves customers over. Sell the build with a launch push: a QR code in every bag and on every bill, a first-order coupon, a WhatsApp broadcast and Meta ads.

## Problem

The restaurant pays commission on every aggregator order, never sees who its customers are and can't remarket to them. v1 gives it a direct channel that is as fast to order from as Zomato and that the kitchen can't miss.

## Goals

1. A customer goes from link to placed order in under 90 seconds on a mid-range Android phone on 4G.
2. No order is missed. Every new order sounds an alarm in the kitchen, and the owner gets a WhatsApp if it isn't accepted within 2 minutes.
3. Direct orders reach a share of total orders agreed with the client, measured at 90 days.

## Roles

| Role          | Device                                             | Does                                                                           |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Customer      | Website, or the Flutter customer app (Android/iOS) | Browses, orders, pays, tracks, rates                                           |
| Kitchen staff | Android tablet at the counter, Partner app         | Accepts or rejects, prints KOT, marks ready, toggles stock                     |
| Rider         | Own Android phone, Partner app                     | Picks up, navigates, shares location, closes the order with the customer's OTP |
| Owner / admin | Laptop or phone, web admin                         | Menu, pricing, zones, coupons, staff, refunds, reports                         |

## v1 scope

### Customer storefront

- Menu by category, with search, a veg-only toggle and veg/non-veg marks; out-of-stock items greyed out
- Variants (half/full, sizes) and add-on groups with min/max rules
- Cart persists across visits; minimum order and delivery fee shown before checkout
- Phone OTP login at checkout only, not before browsing
- Address by map pin plus house/flat and landmark fields; saved addresses
- Zone check on pin drop; out-of-zone customers are offered pickup
- Delivery or pickup order types
- UPI/card via Razorpay, or COD; coupon at checkout
- Live tracking: status timeline, ETA, rider on the map when out for delivery, a call-rider button
- Cancel until the kitchen accepts (paid orders refund automatically); order history, one-tap reorder, rating after delivery
- The same features in the Flutter customer app, plus push notifications for order updates; English first, with strings ready for Punjabi in v1.1

### Kitchen (Partner app, Android tablet)

- Live board (New / Preparing / Ready) with a loud alarm that rings until the order is accepted, even with the screen off or the app closed
- Accept with a prep time (10/20/30/45 min) or reject with a reason
- Print KOT and bill on an 80 mm Bluetooth thermal printer
- Quick out-of-stock toggles; pause online orders when the kitchen is slammed

### Rider (Partner app, Android phone)

- Assigned orders, address and landmark, one-tap Google Maps navigation, call customer
- Shares live location while a delivery is active, even with the phone locked
- Closes the order with the customer's 4-digit OTP and records COD collected

### Admin (web)

- Menu, categories, variants, add-ons and photos
- Hours, holidays, delivery fee slabs, minimum order, packaging charge, GST, COD cap
- Coupons, staff and rider accounts, customer list with CSV export
- Reports: daily sales, item-wise sales, payment-mode split, cancellations
- Cancel and refund; edit the legal pages

## Not in v1

- Scheduled orders (v1.1); an iOS build of the Partner app
- Dine-in QR ordering (v2, a cheap add and a good upsell)
- Loyalty points, table reservations, multi-outlet UI
- POS integration and Zomato/Swiggy menu sync
- Third-party rider APIs such as Porter or Shadowfax (v2, if their own riders can't keep up)

## Success metrics (proposed, to agree with the client)

| Metric                                   | Target   |
| ---------------------------------------- | -------- |
| Cart → placed order                      | ≥ 30%    |
| Median time to accept                    | < 60 s   |
| Missed orders (never accepted)           | 0        |
| Median order-to-door                     | ≤ 40 min |
| Customers who order again within 30 days | ≥ 25%    |

## Open questions for the client

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

## Compliance flags

None of these block the build, but each needs a yes from the restaurant's CA or from Razorpay before go-live.

- **GST.** On its own site, the restaurant itself charges GST and issues the tax invoice; the aggregator rule that has Zomato/Swiggy pay restaurant GST does not apply here. Their CA confirms three things: the rate (usually 5% for restaurants), how the packaging charge is taxed, and, if they're on composition, that direct online sales are fine.
- **FSSAI.** Show the licence number on the site footer and on every bill and invoice.
- **Razorpay KYC.** The account is in the restaurant's name, with their PAN, GSTIN and current account. Before Razorpay activates it, the site needs live Contact, Terms, Privacy, Refund & Cancellation, and Delivery policy pages, so they ship in week 1. Funds settle straight to the restaurant. Adsol never collects and passes money on, which keeps us clear of RBI payment-aggregator rules.
- **DPDP Act.** Phones, addresses and order history are personal data. We need a privacy notice and consent at OTP login, an account-deletion option, and a separate opt-in before any WhatsApp marketing (Meta requires the opt-in too). The restaurant is the data fiduciary and Adsol is the processor, so Aman adds a data-processing clause to the contract.
- **App stores.** Publish the customer app under the restaurant's own Google Play and Apple developer accounts. Apple expects a business's app to be published by that business and often rejects restaurant apps sent from an agency's account. Both stores need a privacy policy URL, their privacy/data-safety forms, and in-app account deletion (already in scope).
