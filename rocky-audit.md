# ROCKY — PRE-DEMO AUDIT REPORT

**Codebase:** `/Users/aldodeda/Downloads/valsa-app`
**Supabase project:** `oamrocbawmvlgrauqyjn`
**Date:** 2026-06-13

---

## WHAT WORKS

1. **Authentication — complete**: Email/password, Google OAuth, Apple OAuth, password reset. Both PKCE (`?code=`) and implicit (`#access_token=`) flows handled with polling fallback. `handle_new_user` DB trigger auto-creates `public.users` on signup. `onAuthStateChange` + init poll covers all edge cases.

2. **Password reset page** (`/app/(auth)/reset/page.tsx`): Fully implemented. Handles code exchange, PASSWORD_RECOVERY event, `loading → form → success → invalid` phases. Not a stub — works correctly.

3. **5-tab structure**: All 5 tabs (Oggi / Settimana / Mese / Anno / Impara) implemented in `AppShell.tsx`. Tab state, greeting messages, per-tab chat history are all wired.

4. **Core shift registration loop** (`/api/turno`): The full pipeline works — Claude extraction pass → JSON parse → DB insert (shifts + purchases + suppliers + shift_workers + conversations) → Claude analysis pass → response. `TURNO_EXTRACTION_PROMPT` is comprehensive with missing_fields, purchases array, confidence levels.

5. **Context-aware AI chat for all 4 non-day tabs** (`/api/chat`): Each tab queries the right data (week shifts/purchases/workers, month COGS categories, year monthly aggregates, 30-day learn context) and builds rich extraContext for Claude.

6. **`get_dati_ristorante` RPC**: Well-designed — returns restaurant + active employees + active fixed_costs + active goals + last 7 shifts + suppliers in one JSON call. Used correctly in both API routes.

7. **7-step onboarding flow**: Welcome → profile/venue → format → tour (with all 5 tab descriptions) → optional fixed costs → optional staff → summary. `onboarding_step >= 4` gate in `page.tsx` correctly routes to app vs onboarding.

8. **RLS enabled on all 11 tables**: All tables correctly scoped by `user_id` via subquery on `restaurants`. Service role used in API routes to bypass RLS safely.

9. **Landing page**: 3-panel swipeable carousel (Hero, Promises, Pricing) with touch start/end events, horizontal swipe detection, pagination dots, and responsive layout.

10. **Dashboard**: Revenue vs expenses, smooth SVG line chart, month-over-month delta (green/red), live Supabase data from current + previous month.

11. **WeekCalendar**: Color-coded bar chart (green/yellow/red by prime cost), weekly KPI rows (revenue, categorized purchases, labor estimate, prime cost %).

12. **MonthSummary**: EBITDA calculation, breakeven daily revenue, categorized COGS, semaforo badge.

13. **YearSummary**: 12-month bar chart, annual net margin, semaforo, color-coded by prime cost per month.

14. **EmployeePanel**: Shift worker selection with hours, wired to `pendingWorkers` state, submitted with `/api/turno` call.

15. **SettingsScreen**: Profile, venue, fixed costs (CRUD), staff (CRUD), Stripe checkout/portal, account deletion UI (4 states: idle → confirming → requested → fake).

16. **Stripe integration**: Checkout session with `user_id` in metadata, billing portal, full webhook lifecycle — `checkout.session.completed`, `subscription.created/updated/deleted`, `invoice.paid`. `resolveUserId` handles both metadata and `stripe_customer_id` lookup.

17. **i18n — 7 languages**: `it, en, fr, es, pt, de, nl`. Cookie-based preference + Accept-Language fallback in `i18n/request.ts`. `SettingsScreen` allows live language switching via cookie + reload.

18. **Rocky mascot**: Full SVG lobster implemented (`Mascot.tsx`) — body, claws, antennae, tail fan, eye reflections. Used across landing, onboarding, dashboard, and reset page.

19. **API security for CRUD routes**: `/api/employees`, `/api/fixed-costs`, `/api/restaurant` all verify the calling user owns the `restaurant_id` before any mutation. Correct pattern.

20. **All required env vars present**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.

21. **Database populated with real test data**: 6 shifts, 6 conversations, 5 employees, 5 fixed costs, 2 suppliers, 2 purchases, 4 shift_workers across 3 restaurants / 2 users.

22. **UI component library**: `Button`, `Bubble`, `Semaforo`, `KpiRow`, `HeroNumber`, `Chip`, `TextInput`, `SuggestChip`, `Pips`, `NoteBox`, `Card` — all implemented in `ui/index.tsx`.

---

## WHAT IS BROKEN

### [BLOCKER — visible in every demo]

**1. `AppShell.tsx:146` — `h-full` on root div instead of `h-[100dvh]`**

The root container is `<div className="flex flex-col h-full">`. The body has `min-h-[100dvh]` not `h-[100dvh]`, so `h-full` resolves to the content height, not the viewport. The tab bar spacer (lines 196–200) and the fixed nav bar rely on a viewport-height parent. On mobile, the nav floats mid-screen or the content overflows behind it.

Fix: change line 146 to `<div className="flex flex-col h-[100dvh]">`.

---

### [SECURITY — critical]

**2. `/api/turno/route.ts:109` and `/api/chat/route.ts:39` — no restaurant ownership verification**

Both routes accept `restaurant_id` from the request body, then immediately use `createServiceClient()` (service role, bypasses RLS) with only a null-check: `if (!restaurant_id) return ...`. Any authenticated user can submit any UUID as `restaurant_id` and: read another restaurant's data via `get_dati_ristorante`, write shifts/conversations to another restaurant, and consume Claude API calls at the app's expense.

Fix: add a JWT-based ownership check identical to the `getAuthenticatedRestaurant` pattern in `/api/employees/route.ts:13–28`.

---

### [DATA BUG — breaks week tab AI context]

**3. `/api/chat/route.ts:70–78` — `id` not in week shifts select, `weekWorkers` always `[]`**

The week query selects:
```
"shift_date, service_type, revenue, receipts, service_hours, workers_count, supplier_spend, avg_receipt, food_cost_pct"
```
Then line 77 does `.map((s: Record<string, unknown>) => s.id)`. `id` was never selected, so `s.id` is `undefined` for every row. `.filter(Boolean)` removes all of them. The `shift_workers` IN clause is always empty → `weekWorkers` is always `[]`. The AI for the week tab never knows who worked or for how long.

Fix: add `id` to the beginning of the week shifts select string.

---

### [DATA BUG — wrong month in Year tab]

**4. `YearSummary.tsx:51` — timezone bug in month parsing**

```ts
const m = new Date(s.shift_date).getMonth();
```

`new Date("2026-01-15")` parses as UTC midnight. In any UTC-negative timezone, this becomes the previous day (December 31st) and `.getMonth()` returns 11 (December) instead of 0 (January). Shifts will appear in the wrong month column on the year chart.

Fix: `const m = parseInt(s.shift_date.split('-')[1]) - 1;` — consistent with how WeekCalendar handles dates via `localIso`.

---

### [BROKEN UX — free plan has no limits]

**5. `SettingsScreen.tsx:225–228` — usage bars hardcoded to `used: 0`**

```ts
const USAGE_TABS = [
  { label: tApp("tabDay"),   limit: 5, used: 0 },
  { label: tApp("tabWeek"),  limit: 5, used: 0 },
  { label: tApp("tabMonth"), limit: 5, used: 0 },
  { label: tApp("tabLearn"), limit: 5, used: 0 },
  { label: tApp("tabYear"),  limit: 3, used: 0 },
];
```

The Plan section shows usage progress bars that are always empty. There is no code anywhere that counts messages per tab per user and compares to plan limits. Free users can send unlimited messages to Claude. The limit display is cosmetic only.

---

### [BROKEN UX — account deletion does nothing]

**6. `SettingsScreen.tsx:719–740` — "delete account" is a fake UI**

When the user confirms deletion, `setDeleteState("requested")` is called. This just shows a "contact support" message. No API call is made, no data is deleted, no email is sent. The user believes they triggered deletion but nothing happens. This is a GDPR concern and a trust issue before a real user test.

---

### [HARDCODED — breaks multilingual turno analysis]

**7. `/api/turno/route.ts:47–59` — `buildShiftAnalysisMessage` is always in Italian**

The function returns hardcoded Italian strings ("Turno appena registrato — analizza le performance e dai il semaforo.", "Rispondi con semaforo 🟢🟡🔴, numero-eroe e max 3 righe di analisi.") regardless of the `locale` parameter that is correctly passed and used everywhere else. For a French user, the trigger message sent as a user turn is in Italian, causing Claude to occasionally respond in Italian.

Fix: accept `locale` as a parameter and translate the hardcoded strings, or pass the language instruction via the system prompt instead of the user message.

---

### [HARDCODED — inaccurate breakeven]

**8. `MonthSummary.tsx:102` — `workingDays` hardcoded to 25**

```ts
const workingDays = 25;
const dailyFixed = (fixedTotal + laborEstimate) / workingDays;
```

The restaurant profile has `open_days_per_week` in the DB and in `lib/types.ts`. The breakeven calculation always divides by 25 regardless of actual schedule. A 5-day restaurant has ~22 working days/month; a 7-day one has ~30. The breakeven shown to users can be materially wrong.

Fix: `const workingDays = (restaurant?.open_days_per_week ?? 6) * 4.33;`

---

### [DEAD CODE — proxy.ts never runs]

**9. `src/proxy.ts` is not `src/middleware.ts` — it never executes**

The file exports a `proxy` function and a `config.matcher`, which are Next.js middleware conventions. But Next.js only loads `middleware.ts` (or `.js`) from the project root — not `proxy.ts`. This file is never invoked. The locale cookie is never set by this path. The app works because `i18n/request.ts` detects locale on every server render via Accept-Language, but this file is misleading dead code.

---

## WHAT NEEDS TO BE REMOVED

**1. "Valsa" and "n8n" references in DB column/table comments**

These are in the Supabase schema and don't affect runtime, but are confusing and represent legacy naming from before the Rocky rebrand:

- `restaurants.onboarding_step` comment: *"Traccia il livello di completezza del profilo (1-4) per l'onboarding progressivo di **Valsa**."*
- `conversations` table comment: *"Permette a **n8n** di ricostruire il contesto recente da passare a Claude."* (n8n is gone)
- `goals` table comment: *"Usati da **Valsa** per contestualizzare i consigli."*
- `employees.hourly_rate_gross` comment: *"Se NULL **Valsa** stima ~20€/h e lo dichiara."*

Fix: run `COMMENT ON COLUMN ...` / `COMMENT ON TABLE ...` migrations to update these to "Rocky".

---

**2. `src/proxy.ts`**

Either rename to `src/middleware.ts` and export the function as `default` to make it actually run, or delete it entirely. As-is it does nothing, duplicates the locale detection already in `i18n/request.ts`, and misleads anyone reading the codebase.

If keeping: rename and change to:
```ts
export default function middleware(req: NextRequest) { return proxy(req); }
export const config = { matcher: ['/((?!_next|api|favicon\\.ico).*)'] };
```

---

**3. `goals` table — unused**

0 rows in production. No API route reads or writes to it. No UI references it (not in SettingsScreen, not in onboarding, not in any chat context that the app builds — only bundled silently by `get_dati_ristorante` as an always-null array). Either implement a goal-setting UI or drop the table.

---

**4. Stripe price IDs hardcoded in `src/lib/stripe.ts:6–9`**

```ts
export const PRICE_IDS = {
  base: "price_1Th5XyQ5DmKxu1Cgr1g5On4r",
  pro:  "price_1Th5ZeQ5DmKxu1Cgt9gM0OzJ",
}
```

If the Stripe account switches between test and live mode, or prices are updated, these break silently with no error until a user tries to check out. Move to `STRIPE_PRICE_BASE` / `STRIPE_PRICE_PRO` environment variables.

---

**5. Duplicate / open INSERT RLS policies on most tables**

Every table has both a legacy `"solo i propri"` ALL policy AND newer granular SELECT/INSERT/UPDATE/DELETE policies. The INSERT policies have `qual: null` (no WITH CHECK clause), meaning any authenticated user could insert a row for any `restaurant_id` they know via the anon client. In practice this is mitigated because all writes go through the service role, but the policy is incorrect and should be tightened:

```sql
CREATE POLICY "shifts_insert" ON shifts FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM restaurants WHERE user_id = auth.uid()
  ));
```

Apply to: `shifts`, `conversations`, `employees`, `fixed_costs`, `purchases`, `suppliers`, `goals`.

---

## WHAT IS MISSING

**1. Auth guard on `/api/turno` and `/api/chat`**

Not just the ownership check (bug #2 above) but there is also no check that the caller has a valid session at all. An unauthenticated HTTP request with a known restaurant UUID would be processed and billed. Add JWT verification at the top of both routes.

---

**2. Plan enforcement / rate limiting**

The Stripe plan is stored correctly and updated via webhook, but it is never consulted before calling Claude. A free user calling `/api/turno` 1,000 times in a day incurs real Claude API costs with no gate. Minimum viable implementation: check `plan` from `public.users` at the start of both API routes and return a 402 if the user is on `free` and has exceeded a daily/monthly message count.

---

**3. Real account deletion endpoint**

The UI state machine in `SettingsScreen` for account deletion has 4 states already built. What's missing is the server action. Needs a route `/api/account/delete` that:
1. Verifies the caller's JWT
2. Cancels the Stripe subscription if `stripe_subscription_id` is set
3. Calls `supabase.auth.admin.deleteUser(userId)` (cascades to `public.users` via FK)
4. Returns 200 and signs the user out client-side

---

**4. `restaurants.covers`, `open_days_per_week`, and `service_type` never collected during onboarding**

These three columns exist in the DB schema and `lib/types.ts`. They are used (or could be used) in AI context and breakeven calculations. The 7-step onboarding never asks for them. The AI's system prompt will never know if a venue is a 40-seat lunch-only restaurant vs a 120-seat dinner-only one. Add these as fields in onboarding Step 1 or Step 2.

---

**5. No middleware.ts — locale cookie never set on first visit**

Because `proxy.ts` is dead code, the `NEXT_LOCALE` cookie is never initialized by the server on a user's first visit. The locale detection in `i18n/request.ts` falls back to `accept-language` on every SSR, which works, but the cookie-based preference is only active after the user explicitly changes language in Settings. Renaming `proxy.ts` → `middleware.ts` (see "What Needs to Be Removed" #2) fixes this.

---

**6. PWA manifest / installability**

Zero PWA infrastructure in the project. The `viewport` meta has `viewportFit: "cover"` signaling mobile-first intent, and the entire UX is designed for a phone. Restaurant owners testing Rocky on iPhone will open it in Safari — without a manifest, there is no "Add to Home Screen" prompt, no full-screen mode, no splash screen, and no app icon. Minimum needed:
- `public/manifest.json`
- `public/icon-192.png` and `public/icon-512.png`
- `<link rel="manifest" href="/manifest.json" />` in `layout.tsx`

---

**7. Usage tracking — no data written, no query exists**

The settings screen shows per-tab usage bars (e.g. "Oggi: 0/5"). There is no `token_count` aggregate, no `message_count` per tab, no daily reset logic, and no query that populates these numbers. The `tokens_used` column in `conversations` is populated correctly by the API routes, but nothing reads it back for display or enforcement. Either build the counting query or remove the UI until it exists.

---

## NEXT STEPS (PRIORITIZED)

Ordered by impact on a user test with real restaurant owners — core loop: **register a shift → get AI feedback → see data in tabs**.

**1. Fix `AppShell.tsx:146` — `h-full` → `h-[100dvh]`** *(5 minutes)*
Every screen is broken on mobile until this is fixed. Tab bar floats, content is not scrollable within bounds. This is the first thing any tester will notice.

**2. Add restaurant ownership check to `/api/turno` and `/api/chat`** *(30 minutes)*
Copy the `getAuthenticatedRestaurant` pattern from `employees/route.ts`. Without this, you cannot safely test with multiple real restaurant owners simultaneously — their data is cross-accessible.

**3. Fix week tab shift ID bug** — add `id` to select in `/api/chat/route.ts:70` *(2 minutes)*
One word change. Without it, the AI's week tab context never includes employee hours, which is a core value prop of Rocky (prime cost = food + labor).

**4. Fix `YearSummary.tsx:51` — timezone month parsing** *(2 minutes)*
Replace `new Date(s.shift_date).getMonth()` with `parseInt(s.shift_date.split('-')[1]) - 1`. Any restaurant owner testing in a UTC-offset timezone will see shifts in the wrong month.

**5. Localize `buildShiftAnalysisMessage` in `/api/turno`** *(15 minutes)*
Accept `locale` parameter and translate the two hardcoded Italian trigger strings. Required before showing Rocky to any non-Italian speaker.

**6. Rename `proxy.ts` → `middleware.ts` and export as `default`** *(2 minutes)*
Makes locale cookie initialization work on first visit. One-line change.

**7. Fix `MonthSummary.tsx:102` — use `restaurant.open_days_per_week`** *(5 minutes)*
Replace `const workingDays = 25` with the actual value from the restaurant profile passed down from `useAuth()`. The breakeven number is shown prominently — it should be accurate.

**8. Wire real account deletion** *(2–3 hours)*
Add `/api/account/delete`. The SettingsScreen UI is already built. This is a GDPR requirement and a basic trust signal before showing Rocky to real users.

**9. Add PWA manifest** *(1 hour)*
Rocky is a mobile-first product. Without "Add to Home Screen", restaurant owners test in a browser tab. The full-screen native experience is the intended product. Add `manifest.json` + icons + `<link>` in `layout.tsx`.

**10. Remove usage bars or implement real usage counting** *(30 minutes either way)*
The usage bars in Settings show `0/5` always. Showing fake metrics to a user (especially a paying one) erodes trust. Either count `conversations` rows by date per context and display real numbers, or hide the UI until it is built.
