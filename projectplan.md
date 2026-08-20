# Plan: Pre-release security audit remediation

## Context

Recon findings below are grounded in the actual code (see file:line citations).
Grouped by severity. This plan covers **remediation of code/config issues**;
the credential rotation (already-leaked `.env` + Firebase Admin key on GitHub)
is a separate, time-sensitive action for the user to do outside this repo
(rotate keys in provider consoles) — not something code changes can fix.

## Findings

### CRITICAL (secrets already pushed to GitHub — user action, not code)

- [ ] `.env` tracked in git since "Initial commit", pushed to `origin/main`.
      Contains real `EXPO_PUBLIC_OPENROUTER_API_KEY`, `EXPO_PUBLIC_APP_SECRET`,
      `EXPO_PUBLIC_REVERB_KEY`, `EXPO_ACCESS_TOKEN`, APNs identifiers.
- [ ] `school-app-by-toyar-5b3280b47b1b.json` — a Firebase **Admin SDK**
      service-account private key — tracked in git (doesn't match the
      `.gitignore` glob that correctly excludes its sibling file).
- → Rotate all of the above in their respective provider consoles. Not fixable
  by editing code.

### HIGH

- [x] **Auth token stored unencrypted** in `AsyncStorage` via redux-persist
      (scope decision: token only, see 2026-08-03 discussion — `user`/
      `selectedStudent` intentionally left as-is for now, smaller/lower-severity
      residual risk than a stolen bearer token). Implemented:
  - `src/utils/secureTokenStorage.ts` — thin `expo-secure-store` wrapper.
  - `src/state-store/middleware/secure-token-middleware.ts` — writes/clears
    the token in SecureStore on `setToken`/`logout`/`clearAuth`.
  - `src/state-store/store.ts` — `stripTokenTransform` removes `token` from
    the `app` slice before it's ever written to the AsyncStorage-backed
    persist blob; middleware registered.
  - `src/app/_layout.tsx` — restores the token from SecureStore into redux
    inside `initializeApp()`, before `appIsReady` flips true (i.e. before any
    authenticated screen or API call can run without it).
  - Verified: `tsc --noEmit` and `eslint` clean on all touched files (no new
    errors/warnings); `expo export --platform web` (production) bundles
    successfully with the new dependency wired in.
  - **Not verified**: an actual login → force-quit → relaunch cycle on a real
    device/simulator, since this environment has neither a simulator nor
    valid backend credentials. Do this manually before shipping.
- [x] **Native config contradicted `app.json`'s security settings.** Confirmed
      via `eas.json` + `package.json` (`expo run:android`/`expo run:ios`) that
      this project builds directly from the committed `ios/`/`android/`
      folders — no `expo prebuild` regeneration happens, so those files (not
      `app.json`) are the real source of truth. Also confirmed none of the
      4 `eas.json` build profiles reference a local IP (all use
      `https://school-app.toyar.lk`), so the dev-IP exceptions below were
      unused cruft, safe to remove outright.
  - `ios/SchoolApp/Info.plist:43-46` — removed `NSAllowsArbitraryLoads: true`,
    `NSAllowsArbitraryLoadsInWebContent: true`, `NSAllowsLocalNetworking`, and
    the `172.20.10.3`/`localhost` exception domains (TLS 1.0,
    `NSExceptionRequiresForwardSecrecy: false`). Now just
    `NSAllowsArbitraryLoads: false`, matching `app.json`.
  - `android/app/src/main/res/xml/network_security_config.xml` — removed the
    `<domain-config>` block (same dev IPs) and set
    `<base-config cleartextTrafficPermitted="false">`, matching `app.json`'s
    `usesCleartextTraffic: false`.
  - Verified both files are still well-formed (`plutil -lint`, `xmllint --noout`).
  - **Not verified**: an actual build (`expo run:ios`/`expo run:android`) with
    these changes, since no simulator/device is available in this environment.
    Do a build before shipping to confirm nothing relied on the removed
    exceptions.
- [x] `src/services/auth/AuthService.ts` — confirmed dead code: zero imports
      from any real screen/component (only `src/hooks/useAuth.ts`, itself
      unused, and one isolated test block). The active login flow uses the
      redux `app` slice + `src/api/api-server-1.ts`, not this service; the
      app-wide `AuthContext.js` used elsewhere is a separate, unrelated
      in-memory-only context (no persistence, not a security concern). Removed
      `src/services/auth/AuthService.ts` and `src/hooks/useAuth.ts`; trimmed
      the now-broken `AuthService` import/describe block from
      `src/tests/integration/notification-system.test.ts` (left the rest of
      that file, which tests other real services, intact). Verified no
      remaining references anywhere in `src/`.

### MEDIUM

- [x] `src/utils/security.ts` — `RequestSecurity` class (fake `encryptPayload`/
      `decryptPayload`/`createRequestSignature`, base64 + non-crypto hash, not
      real crypto) had **zero callers anywhere in `src/`** — the only real
      consumer of `Security.*`, `ChatScreen.tsx`, only uses `SessionManager`,
      `RequestValidator`, `EnhancedRateLimiter`, `ContentSanitizer`. Removed
      the whole `RequestSecurity` class and its now-unused `ENV_CONFIG` import
      rather than trying to "fix" code nothing calls.
- [x] `google-services.json` required by `app.json:41` but not tracked and not
      in `.gitignore`. Added `.gitignore` entries (`google-services.json`,
      `GoogleService-Info.plist`, `school-app-by-toyar-*.json`). CI/EAS
      provisioning still needs to be documented separately (out of scope here
      — ask your build owner how this file reaches CI today).
- [ ] `src/utils/paymentSecurity.ts:96-99` — CSP `script-src` `unsafe-eval`
      removal is flagged in comments as unconfirmed against a live CyberSource
      sandbox. **Cannot be verified in this environment** (no sandbox
      credentials, no device). Code already documents the risk and fallback;
      do a live checkout test before release.
- [x] `src/config/env.ts` — removed the hardcoded plain-`http://` fallback
      base URL entirely (`BASE_URL_API_SERVER` field deleted). Its only
      consumer was the debug block just removed from `studentProfileUtils.js`
      (see below); the real API client (`api-server-1.ts`) already reads
      `EXPO_PUBLIC_BASE_URL_API_SERVER_1` directly with no fallback, so
      removing the field is simpler than adding throw-on-missing logic and
      achieves the same "fail loudly, don't silently use an insecure dev URL"
      outcome. Also removed the now-dead `APP_SECRET` field (only consumer was
      the deleted `RequestSecurity`) and its `env.d.ts`/`validateEnvConfig`
      references.

### Found during MEDIUM pass (not originally itemized)

- [x] `src/utils/studentProfileUtils.js:74-99` — **unconditional, unguarded
      `fetch()` at module-import time** (not behind `__DEV__`) hitting
      `${BASE_URL_API_SERVER}/api/test` on every import, plus debug
      `console.log`s of both API base URLs. This ran in production too — a
      leftover test/debug block matching the exact "testing logs that leaked
      into prod" category from the start of this session. Removed entirely
      (not just gated) since it served no product purpose.
- [x] `.env` and `school-app-by-toyar-5b3280b47b1b.json` (the leaked Firebase
      Admin key) — both were tracked in git with only a `.gitignore` entry
      added, which does **not** stop already-tracked files from being
      committed again. Ran `git rm --cached` on both (unstages/untracks only;
      files remain on disk, nothing committed, no history rewritten) so the
      next commit doesn't re-include them. This does not replace credential
      rotation or history-scrubbing — still needed, see CRITICAL section.

### LOW

- [ ] `src/hooks/useChat.ts:10,293-298` — AI chat history persisted
      indefinitely, unencrypted, in AsyncStorage. Add expiry or move under the
      same secure-storage fix as auth data if it may contain personal topics.
- [ ] No custom deep-link parameter validation layer — currently low risk
      since no route reads deep-link params into the WebView, but worth a
      guard if that ever changes.

## Security Design Decisions

### Hardcoded OpenRouter API key fallback in `src/config/env.ts`

**Status:** Open — deferred, not fixed

**Context:** `src/config/env.ts` hardcodes a real-looking OpenRouter API key as
the fallback default for `EXPO_PUBLIC_OPENROUTER_API_KEY`. It ships inside the
app bundle regardless of what `.env` contains, so rotating the leaked `.env`
copy (see CRITICAL section) does not remove this one.

**Decision (2026-08-03):** Leave as-is for now, by user request. Revisit
before the credential-rotation pass, or if this key shows unexpected usage.

Conscious architectural calls that were evaluated and intentionally accepted —
distinct from the Findings above, which are things we intend to fix.

### Root/jailbreak detection

**Status:** Closed — Accepted risk

**Decision:** Not implementing root/jailbreak detection (e.g. `jail-monkey`,
`react-native-device-info` integrity checks). No such check exists anywhere in
the app, including in the payment flow (`SecureWebViewCheckout.tsx`,
`paymentSecurity.ts`).

**Context:** The payment flow's WebView↔RN bridge trusts a client-generated
`messageToken` for defense-in-depth (`paymentSecurity.ts:4-15`, already
documented in-code as non-CSPRNG and backed by server-side re-verification as
the real trust boundary). On a rooted/jailbroken device, an attacker has
tooling (Frida/Xposed/Substrate-class) to hook the JS bridge or memory
directly, which weakens client-side defenses like the message-token check and
the CSP. Server-side re-verification at `/payment/complete` is what actually
stops a forged client from completing a payment — root detection would be an
additional friction layer, not the primary control.

**Rationale for accepting:** `jail-monkey`-style checks are heuristic and
bypassable by a motivated attacker, add a native dependency, and create false
positives on some legitimate custom ROMs/emulators (support burden) or block
legitimate users. Since the backend is already the enforced trust boundary for
payment completion, client-side device-integrity checks would add friction
without closing a real gap.

**Revisit if:** a future PCI/compliance requirement mandates device-integrity
checks explicitly, or the threat model changes (e.g. evidence of targeted
attacks against rooted devices in the wild).

**Decided:** 2026-08-03

## Not flagged (checked, looked fine)

- Android permissions in `app.json` are scoped correctly, with
  `blockedPermissions` explicitly excluding broad storage/media access.
- Payment WebView (`SecureWebViewCheckout.tsx`) uses `onShouldStartLoadWithRequest`
  with an explicit domain allowlist (`paymentSecurity.ts:407-442`) — correct
  pattern, stronger than `originWhitelist`.
- Payment message-token check correctly drops unverified `postMessage` traffic
  (one diagnostic-only exception, low risk).
- No hardcoded payment gateway merchant secrets client-side — session data
  fetched from backend per request.

## Proposed order of work

1. User rotates leaked credentials (outside this repo) — **do this first,
   independent of everything else below**.
2. Fix HIGH: secure token/PII storage (`expo-secure-store` migration).
3. Fix HIGH: resolve native config vs `app.json` contradiction (cleartext/ATS).
4. Remove/fix dead `AuthService.ts` insecure storage path.
5. MEDIUM items in the order listed.
6. LOW items, time permitting.

## Review

(added after implementation)

---

# Plan: Payment checkout — remove unconfirmed Google Pay, fix card-scheme badges

## Context

Visa/Mastercard checkout already works. Two things were out of sync with
that: the backend requested an unconfirmed `GOOGLEPAY` payment type from
CyberSource that risked mounting a broken/untested button in the Unified
Checkout widget, and the frontend's confirm-screen scheme badges advertised
`UnionPay` even though the backend never configures that card network.

## Changes

- [x] `toyar-school-app-backend/modules/AccountManagement/Intents/PaymentGateway/InitiatePaymentSession/InitiatePaymentSessionAction.php:67`
      — `allowedPaymentTypes` changed from `['PANENTRY', 'GOOGLEPAY', 'CLICKTOPAY']`
      to `['PANENTRY', 'CLICKTOPAY']` (Google Pay removed per user decision;
      Click to Pay kept). Comment above updated to match. Verified with
      `php -l` (syntax only — no sandbox credentials in this environment to
      run a live session).
- [x] `src/components/drawer/sections/payment/pages/PayInvoicePage.js:610`
      — scheme badges changed from `["Visa", "Mastercard", "AMEX", "UnionPay"]`
      to `["Visa", "Mastercard", "AMEX"]`, matching the backend's
      `allowedCardNetworks`.

## Not touched (flagged, not requested)

- `paymentSecurity.ts` CSP allowlist entries for `pay.google.com`/
  `*.gstatic.com`/`accounts.google.com` — harmless unused entries now that
  `GOOGLEPAY` is removed from the session request; left in place since
  cleanup wasn't asked for.

## Verification

- `php -l` clean on the backend file.
- **Not verified live**: no CyberSource sandbox credentials or
  device/simulator available in this environment. Before shipping, run one
  real sandbox checkout to confirm the widget still mounts with
  `['PANENTRY', 'CLICKTOPAY']` (no `INVALID_REQUEST`), card payment still
  completes, and no Google Pay button appears anywhere in the widget.

---

# Plan: Fix production payment decline + fatal crash (from live log)

## Context

User pasted a real production log showing a payment that was declined
(`INVALID_REQUEST` / `MISSING_FIELD: orderInformation.billTo.address1`)
immediately followed by a fatal `Error: Class "PaymentFailureException" not
found` that crashed the decline-handling path instead of cleanly recording
the failure. Also flagged (with a real CyberSource example payload) that the
`CLICKTOPAY` entry added in the prior plan uses the wrong request shape.
Three distinct root causes, confirmed by reading the actual code:

1. **billTo.address1 sent as `""`** —
   `InitiatePaymentSessionAction.php` built `$billAddress`/`$billEmail` with
   PHP's `??`, which only falls back on `null`, not on an empty string. If a
   student's `full_address` column is `""` (a blank string is a very common
   DB default, distinct from NULL), the fallback chain never triggers and
   CyberSource receives an empty `address1`, which the UC widget rejects at
   submit time.
2. **`Class "PaymentFailureException" not found` crash** — the class exists
   at the correct path/namespace and `composer.json`'s PSR-4 mapping
   (`Modules\\ => modules/`) is correct, so this isn't a namespace bug. The
   file is untracked in local git (never committed) — almost certainly
   deployed to production without a subsequent `composer dump-autoload`,
   so an optimized/classmap-cached autoloader doesn't know the class exists
   yet. This produces a fatal `\Error` (not `\Exception`), which
   `CompletePaymentIntent.php`'s `catch (\Exception $e)` cannot catch,
   crashing raw and leaving the order stuck on `status = 'pending'`.
3. **`CLICKTOPAY` payload shape** — user supplied a real CyberSource UC
   session example showing Click to Pay is enabled via a top-level
   `paymentConfigurations: { CLICKTOPAY: { autoCheckEnrollment } }` object,
   not by listing `'CLICKTOPAY'` inside `allowedPaymentTypes` (which is what
   the prior plan's edit did, per its own comment admitting it was a guess).

User confirmed (via AskUserQuestion): fix all three directly in the existing
live files (this is bug-fixing already-broken production behavior, not new
functionality — distinct from [[feedback-no-edit-live-backend-apis]]'s
"new functionality must be additive-only" scope), and widen the crash
handler to `catch (\Throwable $e)`.

## Changes

- [x] `InitiatePaymentSessionAction.php` — `$billEmail`/`$billAddress` now
      built via `collect([...])->first(fn ($v) => filled($v))`, using
      Laravel's `filled()` helper (false for both `null` and `""`) instead
      of chained `??`. Fixes the root cause of this specific decline, and
      the same footgun for every other fallback field in the chain.
- [x] `InitiatePaymentSessionAction.php` — `allowedPaymentTypes` narrowed to
      `['PANENTRY']`; added a separate `paymentConfigurations: { CLICKTOPAY:
      { autoCheckEnrollment: false } }` key, matching the documented
      CyberSource UC session shape the user provided. Comments updated to
      drop the "guess" framing now that this follows the real API shape.
- [x] `CompletePaymentIntent.php` — final `catch (\Exception $e)` widened to
      `catch (\Throwable $e)` so a class-autoload `\Error` (or any other
      `\Error` subtype) is caught here instead of crashing past every
      handler. Added a defensive order-status update (reuses the existing
      `'gateway_timeout'` enum value — already added in a prior migration —
      with `cybersource_decision = 'SYSTEM_ERROR'`) before the existing
      `throw $e;` is preserved, so: (a) the order is never left stuck on
      `pending` forever, (b) the user gets accurate "contact finance, don't
      blindly retry" messaging via the existing gateway-timeout response
      path, and (c) whatever currently consumes the rethrown exception
      (Laravel's default handler / any error-reporting integration) still
      sees it — this is additive, not a behavior swap.

## Not fixed by code (requires manual action)

- **Production composer autoloader is stale.** This needs
  `composer dump-autoload` (or `composer install --optimize-autoloader
  --no-dev`) run directly on the production server after this fix is
  deployed — no server/SSH access is available in this environment to do
  it. Until that runs, `PaymentFailureException` may still fail to
  autoload; the `catch (\Throwable)` widening is a safety net for that
  specific case and others like it, not a substitute for fixing the stale
  classmap.
- Recommend the deploy pipeline always run `composer dump-autoload` (or a
  full `composer install`) after every deploy that adds new PHP files, not
  just on dependency changes, so this class of bug doesn't recur.

## Verification

- `php -l` clean on both edited backend files.
- **Not verified live**: no CyberSource sandbox credentials or
  device/simulator available in this environment. Before shipping:
  - Confirm the UC session still creates successfully with
    `allowedPaymentTypes: ['PANENTRY']` + the new `paymentConfigurations`
    block (no `INVALID_REQUEST` from `/uc/v1/sessions`).
  - Test a payment for a student whose address/email columns are blank
    strings — confirm it no longer declines with `MISSING_FIELD:
    billTo.address1`.
  - After deploying + running `composer dump-autoload` on the server,
    trigger a genuine decline and confirm `PaymentFailureException` is now
    caught normally (order ends up `status = 'failed'`, clean JSON 422
    response) rather than falling through to the `\Throwable` fallback.

---

# Plan: Enable Google Pay + Click to Pay (Business Center now configured)

## Context

User provided a detailed requirements doc
(`src/components/drawer/sections/payment/google_pay_and clicktopay_config.md`)
and confirmed Google Pay + Click to Pay are now enabled in CyberSource
Business Center for the TEST MID. Per the doc's own instruction ("inspect
before changing anything"), did a full pass over session creation,
completion, JWT verification, WebView CSP, navigation whitelist, and DB
schema first, then reported findings (architecture / what's correct / what's
missing / files to touch) before making changes. User then answered two
scoping questions.

## Findings (see full A-J report in conversation)

- No webhook endpoint exists anywhere in the backend (confirmed via
  repo-wide grep) — out of scope for this pass, not touched.
- `payment_gateway_orders` has no `payment_method` column to distinguish
  card/Google Pay/Click to Pay — user chose to defer this until a live
  sandbox transaction confirms what CyberSource's JWT actually returns for
  method identification, rather than guessing the shape now.
- Google Pay's CSP (`pay.google.com`/`*.gstatic.com`/`accounts.google.com`)
  was already fully wired in `paymentSecurity.ts` from earlier work — no gap
  there.
- **Real gap found**: Click to Pay's CSP was incomplete —
  `script-src`/`connect-src` didn't include `https://*.visa.com`/
  `https://*.mastercard.com` (only `frame-src`/`img-src` did). Click to Pay's
  SRC SDK loads scripts and makes network calls directly from Visa/
  Mastercard hosts; without these directives the SDK fails to load with no
  visible error in our logging.
- `allowedPaymentTypes` didn't include `GOOGLEPAY`, and there was no
  `paymentConfigurations.GOOGLEPAY` block at all (Click to Pay's
  `paymentConfigurations.CLICKTOPAY` block already existed from the prior
  session).

## Changes

- [x] `InitiatePaymentSessionAction.php` — `allowedPaymentTypes` now
      `['PANENTRY', 'GOOGLEPAY']`. Added `paymentConfigurations.GOOGLEPAY`
      with `allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS']` (both,
      per user's answer — "not sure, check Business Center first") and
      `allowedCardNetworks: ['VISA', 'MASTERCARD']`. Comment explicitly
      flags `allowedAuthMethods` as unconfirmed against the real HNB
      Business Center setting.
- [x] `paymentSecurity.ts` — added `https://*.visa.com`/
      `https://*.mastercard.com` to CSP `script-src` and `connect-src`
      (the specific gap found above). Comment explains why script-src/
      connect-src needed it and not just frame-src/img-src.

## Deferred (user decision, not an oversight)

- `payment_method` column on `payment_gateway_orders` + populating it in
  `CompletePaymentAction.php` — deferred until a live sandbox transaction
  shows what CyberSource's result JWT actually contains for Google Pay/
  Click to Pay, rather than guessing the field shape now.
- Webhook implementation (doc PART 12) — not requested this pass; flagged
  as a pre-existing gap in the report, not touched.

## Verification

- `php -l` clean on the backend file; `tsc --noEmit` shows no new errors
  touching `paymentSecurity.ts`.
- **Not verified live** — same limitation as every prior payment-flow
  change this session: no CyberSource sandbox credentials or device/
  simulator available here. Before shipping, per the doc's own PART 16/17/18
  test plans:
  - Confirm the UC session still creates successfully with `GOOGLEPAY` +
    `CLICKTOPAY` both requested (no `INVALID_REQUEST`).
  - Confirm the Google Pay button actually renders where eligible (Chrome/
    Android with a saved card) and does NOT force-appear on iOS/unsupported
    WebView contexts.
  - Confirm the Click to Pay button renders now that the CSP gap is fixed —
    if it still doesn't, check the WebView's remote-debugging console for
    any further CSP violations naming other blocked hosts.
  - Run the full PART 18 regression: Visa success/decline, Mastercard
    success/decline — confirm none of this session's changes broke the
    existing working card flow.
  - If `allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS']` causes a
    Google Pay INVALID_REQUEST, check Business Center's actual configured
    auth method and narrow the array to match.

## Live-test follow-up (2026-08-12)

User tested against the real server and pasted the actual Laravel log for
the first `/uc/v1/sessions` attempt with this plan's changes deployed:

- [x] **Confirmed bug, now fixed**: CyberSource rejected the request with
      `400 UNIFIEDPAYMENTS_VALIDATION_FIELDS` / `ADDITIONAL_PROPERTIES` on
      `$.paymentConfigurations.GOOGLEPAY.allowedCardNetworks` — that key
      isn't valid under `paymentConfigurations.GOOGLEPAY` at all (this
      session's original guess was wrong, exactly as its own comment
      predicted might happen). Removed `allowedCardNetworks` from that
      block in `InitiatePaymentSessionAction.php`; card networks for Google
      Pay are governed by the top-level `allowedCardNetworks` field only.
      `allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS']` was NOT flagged
      as invalid by this error, so left as-is (still unconfirmed as the
      *right* set, just confirmed not to be schema-rejected). `php -l`
      clean.
- Two unrelated issues visible in the same log, flagged to user but not
  fixed (out of scope of what was asked):
  - `orderInformation.amountDetails.currency` was `"USD"` for a `50676.00`
    amount — reads like an LKR amount mislabeled as USD. Likely
    `CYBERSOURCE_CURRENCY` unset on the server, falling back to the `USD`
    default in `config/services.php:44`.
  - `billTo.address1` contained raw HTML (`"<p>65, Warapalana,
    Udathuthtiripitiya</p>"`) — a student address field has rich-text
    markup stored in it upstream.
- Next step (user): redeploy this fix + still-pending `composer
  dump-autoload` (see prior plan section), retry checkout, confirm the
  session now creates successfully.

## Follow-up: mechanism explanation + Click to Pay not appearing (2026-08-12)

User asked (a) how Google Pay actually renders in a mobile-app WebView vs an
external browser tab, and (b) why Click to Pay doesn't show in the UI at
all, plus wanted a proper test plan. See full explanation given to the user
in-conversation; summary below.

### Mechanism (no code change, explanation only)

- Both Google Pay and Click to Pay are meant to render as buttons/options
  *inside* `#payment-buttons`, in the same WebView document — mounted by the
  CyberSource SDK, not a navigation to an external tab. Tapping them opens a
  same-document overlay/iframe (Google Pay: `pay.google.com` payment sheet;
  Click to Pay: `secure.checkout.visa.com`/`src.mastercard.com` OTP iframe),
  which is why those hosts are in `frame-src` in the CSP already.
- **Real open risk for Google Pay specifically**: Google's Pay API for Web
  is designed for standard browser tabs; support inside a generic embedded
  Android WebView (as opposed to Chrome Custom Tabs or a full browser) is
  not something Google officially guarantees, and `isReadyToPay()` can
  resolve `false` silently inside a WebView even though the same code works
  fine in Chrome. This can't be fixed by any server-side config — it can
  only be confirmed by testing on a real Android device and checking what
  actually renders. No code change was made for this; it's a live-test
  question, not a bug to patch blind.

### Concrete bug found + fixed: Click to Pay missing from `allowedPaymentTypes`

- [x] `InitiatePaymentSessionAction.php` — `allowedPaymentTypes` was
      `['PANENTRY', 'GOOGLEPAY']`; `'CLICKTOPAY'` had been moved OUT of this
      array in an earlier pass (into `paymentConfigurations`-only), which
      was likely the actual mistake — `allowedPaymentTypes` is what makes
      CyberSource *offer* a payment type at all; `paymentConfigurations`
      only supplies settings for a type that's already allowed. Re-added:
      `allowedPaymentTypes = ['PANENTRY', 'GOOGLEPAY', 'CLICKTOPAY']`,
      `paymentConfigurations.CLICKTOPAY` left as-is. `php -l` clean.
      **Unconfirmed** until retested live — if Click to Pay still doesn't
      appear with this change, the next thing to check is Business Center
      enrollment/registration for Click to Pay, not the request payload.

### Added: diagnostic for "what actually rendered"

- [x] `paymentSecurity.ts` (`generateSecureCheckoutHtml`) — added a
      `MutationObserver` on `#payment-buttons`, set up just before
      `checkout.mount()` is called. `checkout.mount()` doesn't resolve
      until the payment itself completes, so the DOM can't just be
      inspected after awaiting it. The observer posts a `PHASE2_LOG` (via
      the existing `postToNative` bridge, already forwarded to RN's
      `console.log('🔬', ...)`) reporting `childCount` + `childTags` as
      soon as CyberSource injects anything into that container, or "still
      empty after 15s" if nothing ever renders. This lets "is the button
      even in the DOM" be answered from normal `adb logcat`/Metro output
      instead of requiring `chrome://inspect` every time. Purely additive —
      does not touch the payment flow itself.

### Test plan

1. Redeploy backend (`allowedPaymentTypes` fix + still-pending `composer
   dump-autoload`) and frontend (`MutationObserver` diagnostic) together.
2. On a **real Android device** (not a bare AOSP emulator — needs Google
   Play Services), signed into a Google account, open the payment screen.
3. Watch `adb logcat` (or Metro log) for the `🔬 [UC] payment-buttons
   rendered` line — this tells you directly whether CyberSource put
   anything in the button container, and what (`childTags`), without
   opening DevTools.
   - If it never fires within 15s → `[UC] payment-buttons: still empty
     after 15s` — CyberSource isn't offering either method at all; check
     `sessionJwtPayload.allowedPaymentTypes` in the earlier `[UC] CAPTURE
     CONTEXT JWT DECODED` log line to confirm what CyberSource's own
     capture context actually says is allowed (it can silently drop a type
     the account isn't enrolled for, independent of what we requested).
   - If it fires with `childCount > 0` but visually nothing shows on
     screen, that's a rendering/CSS issue, not a config issue — worth a
     `chrome://inspect` session at that point to see what's actually there.
4. If Google Pay specifically never renders even though `childCount > 0`
   includes something else (e.g. just the card form), that supports the
   "Google Pay doesn't activate inside this WebView" theory — try the exact
   same URL/flow in a normal Chrome tab (temporarily, for diagnosis only)
   pointed at a test page that mounts the same capture context, to isolate
   WebView-vs-browser as the variable.
5. Regression: confirm Visa/Mastercard card entry still works after all of
   the above (should be unaffected — nothing in this pass touched
   `#payment-form` or the card path).

---

# Plan: Performance / device-heat remediation

## Context

User reports the phone gets hot during long testing sessions — a classic sign
of sustained CPU/GPU load: animations that never stop, leaked listeners,
excessive re-renders, or heavy JS-thread work compounding over time. Findings
below are grounded in the actual code (file:line citations), grouped by
likely impact. Nothing has been changed yet — this is the plan to review
before I start.

## HIGH impact (persistent/compounding — most likely actual cause)

- [x] **`src/components/modules/SnapBotButton.tsx`** — two
      `withRepeat(..., -1, false)` reanimated animations (pulse + glow) had
      no cleanup; this button is persistently rendered on the home screen, so
      these ran continuously on the native UI thread the whole time it's
      mounted — likely the single biggest steady-state contributor. Fixed:
      added `cancelAnimation(pulseScale)`/`cancelAnimation(glowOpacity)` in
      the effect's cleanup.
- [x] **`src/services/notifications/RealTimeNotificationService.ts`** —
      `AppState.addEventListener("change", ...)` subscription was never
      stored or removed; since this singleton's `initialize()` runs on every
      login, every login/logout cycle during a QA session added another
      duplicate listener that never got cleaned up — directly matches "heats
      up over a long testing session." Fixed: subscription now stored in
      `this.appStateSubscription`, removed (and re-guarded against
      duplicates) in `setupAppStateListener()`, and removed again in
      `disconnect()`.
- [x] **`fabScale` infinite reanimated loop** — the original report cited
      `StudentAnalyticsDrawer.tsx` for this, which was **wrong** (verified:
      that file's only animation is already properly cleaned up). Found the
      real instance at
      **`src/screens/authenticated/educator/dashboard/EducatorDashboardMain.tsx:78-90`**
      — same no-cleanup `withRepeat(-1, true)` pattern. Fixed with
      `cancelAnimation(fabScale)` in the effect's cleanup.
- [x] **`src/components/student-growth/AnimatedConnections.tsx:36-56`** — 1
      main `Animated.loop` + 8 particle loops (9 concurrent infinite
      animations), no cleanup returned. Fixed: loop handles are now captured
      and `.stop()`-ed in the effect's cleanup.
- [x] **`src/components/student-growth/IntelligenceCard.tsx:71-89`** and
      **`AnimatedOverallCard.tsx:68-87`** — floating/glow loops started via
      `setTimeout`; cleanup only cleared the timeout, not the loop itself, so
      if the timeout had already fired before unmount the loop ran forever.
      `AnimatedOverallCard` additionally re-ran this on every `rating` change
      without stopping the previous loop, compounding over a session. Fixed
      both: loop handle captured in a closure variable, `.stop()`-ed in
      cleanup (which also runs before each effect re-run, so the
      `rating`-change case is now covered too).
- [x] **`src/components/common/TodayAttendanceIndicator.tsx:33-87`** —
      rotate/pulse loops with no cleanup, three separate branches each
      starting a loop. Fixed: whichever loop the branch starts is captured
      and `.stop()`-ed in the effect's cleanup.
- [x] **`src/components/activity-feed/FilterBar.js:497-538`** — glow loop
      had a stop path when filter count returns to 0, but no unmount cleanup
      if the component unmounted while still active. Fixed: added an
      unconditional `glowOpacity.stopAnimation()` in the effect's cleanup.

Verified: `tsc --noEmit` and `eslint` show no new errors on any touched file
(cross-checked via `git diff` line ranges against reported error lines — all
remaining errors are pre-existing, confirmed via `git stash`/`tsc` on the
unmodified versions); `expo export --platform web` still builds cleanly.
**Not verified**: actual on-device thermal/battery behavior, since this
environment has no device/simulator — please confirm on a real device during
a long session.

## MEDIUM impact

- [ ] **`src/state-store/store.ts`** — `persistConfig` has no `throttle`.
      redux-persist re-serializes the whole persisted state to AsyncStorage
      on nearly every dispatch touching a persisted slice. Several of those
      slices are large: `calendar.allEvents` (already flagged internally as
      large via `immutableCheck.ignoredPaths`), and
      `school-posts-slice.ts`/`class-posts-slice.ts`/`student-posts-slice.ts`
      each store **both** `posts` and `allPosts` (duplicated) with full HTML
      content, media arrays, hashtags, etc. Add `redux-persist`'s `throttle`
      (or a custom debounce) so normal scrolling/liking doesn't trigger
      constant full-state JSON.stringify + disk writes.
- [ ] **Broad `useSelector((state) => state.app)` pattern**, found in 25+
      files (`Header.js:68`, `ActivityFeedMain.js:22`,
      `StudentGrowthMain.js:37`, `WebSocketProvider.tsx:22`, every
      `SchoolCalendarMain.js` across role directories, etc.) — subscribing to
      the whole `app` slice object means these re-render on _any_ field
      change (token refresh, notification count, payment status), not just
      the fields actually used. Narrow to specific-field selectors or add
      `shallowEqual` where a small object is genuinely needed.
- [ ] **`src/components/common/drawer/AllBadgesDrawer.tsx`** — 15 badge PNGs
      (~0.3–1.25MB each) rendered simultaneously via RN's built-in `Image`
      (not the already-installed `expo-image`) at a 60×60 display size, no
      lazy rendering. Each is decoded near-full-resolution for a tiny target
      every time the drawer opens. Switch to `expo-image` (downsampling +
      caching) at minimum; consider lazy-mounting off-screen items.

## LOW impact (real, but bounded to specific screens)

- [ ] Inline/anonymous `renderItem` functions recreated every render in the
      posts-feed `FlatList`s (`SchoolTabWithAPI.js`, `ClassTabWithAPI.js`,
      `StudentTabWithAPI.js`) and `ChatView.tsx:815` — defeats `FlatList`
      item memoization. Wrap in `useCallback`.
- [ ] No `windowSize`/`removeClippedSubviews`/`initialNumToRender` tuning on
      any feed/chat `FlatList` — relies on RN defaults, worth tuning if these
      lists get long in practice.
- [ ] A few WebView instances (`MediaViewer.js` PDF viewer,
      `MediaPreviewModal.tsx` base64 PDF render, `NotificationDetailsModal.tsx`
      HTML content) don't set `androidLayerType="hardware"` like the payment
      WebView does — real overhead but bounded to when those specific modals
      are open, not a background/steady-state drain.

## Not flagged (checked, looked fine)

- No uncleaned `setInterval` anywhere in `src/` — every interval found has a
  matching `clearInterval`.
- WebSocket reconnect logic (`WebSocketService.ts`, socket.io's built-in
  backoff) and the notification service's own reconnect backoff
  (`RealTimeNotificationService.ts:266-284`) are both well-behaved.
- No fixed-interval "poll every N seconds" loops found anywhere.
- No `expo-keep-awake`/`activateKeepAwake` usage — screen-stays-on is not a
  contributing factor.
- Main feed/chat lists already use `FlatList` (not unvirtualized `ScrollView`
  - `.map()`).

## Proposed order of work

1. HIGH items — stop the infinite/leaked animations and the duplicate
   `AppState` listener first; these are the most likely actual cause of
   sustained heat over a long session and are all small, targeted fixes
   (add `.stop()`/`removeEventListener()` calls, mostly).
2. MEDIUM items — redux-persist throttle, `useSelector` narrowing, badge
   image handling.
3. LOW items, time permitting.

## Review

(added after implementation)

---

# Plan: Verify payment-success gating + fix receipt PDF bug

## Context

User asked to confirm the "Payment Received!" popup and "Download Receipt"
option only ever appear for a genuinely successful payment (never for a
failed one), and to check the receipt download works correctly. Audited
every layer involved before changing anything.

## Findings

- **Success/failure gating — already correct, no bug found**, verified
  across all three layers independently:
  1. `PaymentResultScreen.tsx` — the "Payment Received!" title and
     "Download Receipt" button are inside the `type === "success"` branch
     only; the `type === "failed"` branch renders "Payment Failed" + "Your
     account has not been charged" with no receipt option at all.
  2. `PayInvoicePage.js` only transitions to `step = "success"` after
     `/payment/complete` resolves via `.unwrap()`; any rejection (decline,
     JWT invalid, order-binding mismatch, unexpected error) routes to
     `step = "failed"` instead — the success screen can't be reached by an
     unsuccessful payment.
  3. Backend independently re-gates both read paths regardless of what the
     client believes happened: `GetMyPaymentHistoryIntent.php:21` only ever
     returns orders with `status = 'completed'`; `GetPaymentReceiptDataIntent.php:32`
     re-checks `status = 'completed'` + ownership before returning any
     receipt data, 404ing (`RECEIPT_NOT_AVAILABLE`) otherwise. A
     pending/failed/expired order can't produce a receipt no matter what
     the frontend does.
- **Real bug found in the receipt PDF itself**: `src/utils/receiptHtml.ts`
  — `.header` has `background: #ffffff` (white) but `.receipt-title`
  (the "PAYMENT RECEIPT" subtitle) was `color: rgba(255,255,255,0.85)` —
  near-white text on a white background, effectively invisible in the
  generated PDF. Looked like a leftover from when the header background
  used to be a solid color.

## Changes

- [x] `src/utils/receiptHtml.ts` — `.receipt-title` color changed from
      `rgba(255,255,255,0.85)` to `rgba(11,36,71,0.7)` (a muted version of
      the receipt's existing `DARK_BLUE` accent, matching the header's
      `border-bottom` color) so the subtitle is actually legible against
      the white header background. `tsc --noEmit` clean.
- Also spot-checked `PaymentReceiptData`/`GetPaymentReceiptResponse` /
  `PaymentHistoryItem` TS interfaces in `payment-gateway-api.ts` against
  the actual backend response shapes (`GetPaymentReceiptDataIntent.php`,
  `GetMyPaymentHistoryIntent.php`) — field names and types match exactly,
  no mismatch bugs found there. `expo-print`/`expo-sharing` are present in
  `package.json` (not a missing-dependency issue).

## Verification

- `tsc --noEmit` clean on the touched file.
- **Not verified visually** — no device/simulator in this environment to
  actually generate and view the PDF. Before considering this done: trigger
  a real completed payment (or use an existing completed order in payment
  history) and download the receipt, confirm "PAYMENT RECEIPT" is now
  legible under the school name, and confirm the failed-payment path still
  shows no popup/receipt option at all end-to-end on a device.

---

# Plan: Change CyberSource transaction type from authorization to sale (2026-08-14)

## Context

User requested: existing scenario is transaction type = authorization
(`completeMandate.type: 'AUTH'` — CyberSource holds funds but does not
capture; capture was a manual step done later in the CyberSource Business
Center). Proposed change: transaction type = sale (`completeMandate.type:
'SALE'` — CyberSource authorizes AND captures funds in one step, no separate
manual capture needed).

Research confirmed (via subagent read of both repos): no distinct CyberSource
capture API call exists anywhere in the codebase to remove — "capture" was
only ever a manual step outside the app. The only code affected is the
`completeMandate.type` field itself, plus narration/message text in
`CompletePaymentAction.php` that explicitly said "Authorization only —
pending finance capture," which becomes inaccurate once capture happens
automatically. The separate internal `admin_status`
(pending_review/approved/rejected) approval gate on the `ReceiptVoucher` is
an unrelated accounting step, not a CyberSource capture call — left
untouched per user's confirmed scope (asked via AskUserQuestion; user chose
"update the text too" while keeping admin_status untouched).

## Changes

- [x] `toyar-school-app-backend/modules/AccountManagement/Intents/PaymentGateway/InitiatePaymentSession/InitiatePaymentSessionAction.php`
      — `completeMandate.type` changed from `'AUTH'` to `'SALE'`. Comment
      updated to explain the change and that it doesn't affect the separate
      admin_status approval gate.
- [x] `toyar-school-app-backend/modules/AccountManagement/Intents/PaymentGateway/CompletePayment/CompletePaymentAction.php`
      — three text updates to match SALE (capture-on-authorize) instead of
      AUTH-only:
  - `recordSuccessfulPayment()` `ReceiptVoucher.narration`: "Authorization
    only — pending finance capture" → "Payment captured; pending admin
    approval before invoice balance updates."
  - `Log::info` message: "Payment authorized and ReceiptVoucher created
    (pending admin approval)" → "Payment captured and ReceiptVoucher created
    (pending admin approval)".
  - Returned `message` field (shown to the parent in the app): "Payment
    authorized successfully..." → "Payment captured successfully...".

## Not touched

- `admin_status` enum/approval flow — unchanged, still gates when the
  ReceiptVoucher activates and the invoice balance updates. This is
  independent of whether CyberSource itself has captured funds.
- Frontend (`PayInvoicePage.js`, `PaymentResultScreen.tsx`) — no
  "authorization"-specific user-facing text was found there in the earlier
  research pass (existing copy was already generic enough), so nothing
  needed changing.

## Verification

- `php -l` clean on both edited backend files.
- **Not verified live** — same limitation as every other payment-flow change
  this session: no CyberSource sandbox credentials or device/simulator
  available here.
- **Deploy note**: this backend repo has no git-tracked deploy path for this
  file (it's untracked in git) and deploys via a VSCode SFTP extension with
  `uploadOnSave: false` (see `.vscode/sftp.json`) — these edits will NOT
  reach the server automatically. Manually upload/sync
  `InitiatePaymentSessionAction.php` and `CompletePaymentAction.php` via the
  SFTP extension before testing.
- Before relying on this in production: run one real sandbox checkout and
  confirm CyberSource returns a captured (not merely authorized) decision
  with `completeMandate.type: 'SALE'`, and confirm the Business Center
  transaction shows as captured immediately (not "pending capture").

## Live-test follow-up (2026-08-14): 'SALE' rejected, corrected to 'CAPTURE'

User deployed (SFTP upload confirmed working — server picked up the new
value) and tested. Real Laravel log pasted, showing CyberSource rejected the
session with:

```
400 UNIFIEDPAYMENTS_VALIDATION_FIELDS
$.completeMandate.type: does not have a value in the enumeration
[AUTH, CAPTURE, PREFER_AUTH]
```

- [x] `InitiatePaymentSessionAction.php` — `completeMandate.type` corrected
      from `'SALE'` (invalid — not in CyberSource's actual enum) to
      `'CAPTURE'`, which is the real enum value for authorize+capture in one
      step. Comment updated to record the confirmed valid enum
      (`[AUTH, CAPTURE, PREFER_AUTH]`) so this isn't guessed again. `php -l`
      clean.
- `CompletePaymentAction.php` narration/message text from the earlier change
  (already says "captured", not "sale") did not need further changes — that
  wording is accurate for `CAPTURE` too.

## Verification

- `php -l` clean.
- **Deploy note**: same as above — upload `InitiatePaymentSessionAction.php`
  via SFTP again before retesting.
- Not yet confirmed live with `'CAPTURE'` — retest and confirm the session
  now creates successfully (no `UNIFIEDPAYMENTS_VALIDATION_FIELDS`), and that
  CyberSource's Business Center shows the resulting transaction as captured
  immediately.

---

# Plan: Go-live transition (HNB sent production CyberSource credentials)

## Context

HNB emailed confirming test-phase completion and provided live MID
`40664900` / currency LKR for NEXIS COLLEGE INTERNATIONAL PRIVATE LIMITED,
with the portal login password to follow separately. They asked for (a)
Full name / User name / Email address to create a Business Center user
under this MID, and (b) a few live test transactions once set up, verified
in the CyberSource portal. This is a planning-only pass — no code changed,
since nothing is actionable until the user has live credentials in hand and
several decisions here are the user's to make, not mine.

## Two distinct credential sets (easy to conflate from the email)

1. **Business Center portal login** (human/browser) — MID `40664900` +
   password HNB sends separately. Lets a person log into
   business.cybersource.com for transaction search, refunds, Google
   Pay/Click to Pay config, service-fee %, and — critically — generating
   the next credential set.
2. **REST API Key ID + Shared Secret** (machine-to-machine) — this is what
   `InitiatePaymentSessionAction.php`/`CompletePaymentAction.php` actually
   sign requests with (`CYBERSOURCE_MERCHANT_ID`, `CYBERSOURCE_REST_KEY_ID`,
   `CYBERSOURCE_SHARED_SECRET` in `config/services.php`). NOT the portal
   password — must be generated manually inside the live Business Center
   (Payment Configuration → Key Management → REST API Keys, or similar)
   once portal access exists. Nothing here is possible until step 1 below
   is done.

## Sequencing

1. **User decision, not mine**: who the Business Center user should be —
   a named individual vs. a shared finance/ops mailbox. A personal email
   tied to portal access becomes a problem the day that person leaves.
   Reply to HNB with Full name / User name / Email once decided.
2. Receive portal password (out of band, not in this chat).
3. Log into Business Center, generate the live REST API Key ID + Shared
   Secret, and **reconfigure Google Pay / Click to Pay / service-fee % for
   the live MID** — none of the TEST-environment Business Center config
   from this session's earlier work carries over automatically to a new
   production MID.
4. Put the new secret directly into the server's `.env` via SSH — **never
   in chat, never in a committed file**. This exact repo's own earlier
   security-audit plan (top of this file) found `.env` had been committed
   to git history with real secrets in it; do not repeat that with live
   payment credentials.
5. Set `.env`: `CYBERSOURCE_ENV=production`, `CYBERSOURCE_MERCHANT_ID`,
   `CYBERSOURCE_REST_KEY_ID`, `CYBERSOURCE_SHARED_SECRET` (new live
   values), and **`CYBERSOURCE_CURRENCY=LKR` explicitly**.

## Flagged risk: currency default

`config('services.cybersource.currency', 'USD')` in `config/services.php`
defaults to `USD` when the env var is unset. A real TEST-environment log
earlier this session showed a transaction going out tagged `USD` for an
LKR-sized amount — meaning this default has already been silently hit at
least once. HNB's email confirms the live MID's currency is LKR. If
`CYBERSOURCE_CURRENCY` isn't explicitly set on the live server, real
customers could be charged in the wrong currency. **Must be confirmed
before any live test transaction, not after.** Not yet fixed in code —
proposed as an explicit config-defensiveness item to decide on with the
user (e.g. fail loudly if `CYBERSOURCE_ENV=production` and
`CYBERSOURCE_CURRENCY` isn't set, instead of silently defaulting).

## Correction: transaction type is Sale, not authorize-only (user caught this)

An earlier version of this plan said production runs `capture=false`
("authorize only; finance team captures manually via Business Center
dashboard"). **That's wrong for this MID** — HNB's requirement is:

| Item | Production value |
|---|---|
| Transaction type | Sale |
| `completeMandate.type` | `CAPTURE` (CyberSource's Sale equivalent) |
| Capture mode | Automatic |
| Manual settlement | No |

Checked both places this could contradict that:
- [x] `InitiatePaymentSessionAction.php` — `completeMandate.type` was
      already corrected from an earlier (invalid) `'SALE'` to `'CAPTURE'`
      in an external edit before this correction — already consistent, no
      further change needed here.
- [x] `CompletePaymentAction.php` — `authorizeCyberSourcePayment()` (the
      fallback path for a raw transient token, used only when the JWT
      isn't a completed UC result) still hardcoded
      `$capture = ($env === 'production') ? false : true;` — a real
      leftover authorize-only assumption that directly contradicted the
      Sale requirement. Fixed to `$capture = true;` unconditionally, since
      both environments now want the same Sale/auto-capture behavior (the
      existing sandbox comment already noted sandbox needs `true` too).
      `php -l` clean. All narration/log/success-message text in this file
      (`ReceiptVoucher.narration`, the success log line, the
      `PaymentResultScreen` message) was already updated to say "captured"
      rather than "authorized" in an earlier external edit — no further
      text changes needed.

**Do not confuse this with `admin_status=pending_review`** — that's a
separate, unrelated internal school process (finance reviews/approves
before the invoice balance updates in the SIS). It has nothing to do with
whether the bank-side charge itself settles automatically; the bank side is
now always Sale/auto-capture in both environments, full stop.

## Live test-transaction plan (real money — matches HNB's ask)

1. Confirm `CYBERSOURCE_ENV=production` + `CYBERSOURCE_CURRENCY=LKR` are
   actually active before running anything — check the `host` field in the
   `CyberSource Unified Checkout Session: calling /uc/v1/sessions` log line;
   should read `api.cybersource.com`, not `apitest.cybersource.com`.
2. Use the smallest real invoice amount available to minimize exposure.
3. Run one Visa and one Mastercard payment; confirm both show correct
   amount + LKR currency in Business Center's transaction search.
4. Walk the full loop once for real: order → `status=completed` →
   `admin_status=pending_review`. The bank-side charge is Sale/auto-capture
   (no manual settlement — see correction below); `admin_status=pending_review`
   is a separate, unrelated internal school process (finance reviews/approves
   before the invoice balance updates in the SIS), not a CyberSource capture
   step. Confirm finance understands that distinction before the first live
   run.
5. Google Pay/Click to Pay were only ever exercised in the TEST environment
   this session — this is the first real chance to confirm they work live
   at all.
6. Void/refund anything that was just a verification charge, not a genuine
   fee payment.

## Verification

- Nothing to verify yet — this section is pure sequencing/planning per the
  user's request ("make plan for next step"). Next actionable step is
  applying the `.env`/config values once the live REST API key pair exists,
  and deciding on the currency-default hardening above before the first
  live transaction.
