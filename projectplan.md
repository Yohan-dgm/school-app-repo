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

## CYBERSOURCE_CURRENCY hardening (implemented)

- [x] `config/services.php` — added `currency_explicit` key
      (`env('CYBERSOURCE_CURRENCY') !== null`), resolved inside the config
      file itself (not via `env()` in application code) so it stays correct
      even under `php artisan config:cache`, where direct `env()` calls
      outside `config/*.php` return `null`.
- [x] `InitiatePaymentSessionAction.php` — throws immediately if
      `CYBERSOURCE_ENV=production` and `currency_explicit` is false, instead
      of silently falling through to the `'USD'` default. Does not affect
      TEST environment behavior at all. `php -l` clean on both files.

---

# Plan: Payment gateway — orders-only writes (user requirement)

## Context

User: the payment gateway module must never write to any Account
Management table other than `payment_gateway_orders` and
`payment_gateway_settings` — no invoices, no other records. Reading other
tables (invoice balance lookups, student name for the receipt) is fine;
only writes were the concern.

## What was writing outside those two tables

`CompletePaymentAction::recordSuccessfulPayment()` auto-created a
`ReceiptVoucher` row on every successful payment (`is_active=false`,
pending admin approval) and linked it back via
`payment_gateway_orders.receipt_voucher_id`. This was the only write
outside `payment_gateway_orders` anywhere in the module — confirmed by
grepping the whole `PaymentGateway` module for `::create(`, `->save()`, and
`->update(`: every other write hit is `PaymentGatewayOrder`, and
`PaymentGatewaySetting` is read-only throughout (maintenance-flag checks
only, never written).

## Changes

- [x] `CompletePaymentAction.php` — `recordSuccessfulPayment()` rewritten to
      update only `payment_gateway_orders` (`status`, `cybersource_reference`,
      `cybersource_decision`, `transient_token`). Removed the
      `ReceiptVoucher::create()` call, the `receipt_voucher_id` linkage, the
      now-unused `getInvoiceFkColumn()`/`getReceiptVoucherType()` helpers,
      and the `ReceiptVoucher`/`DB` imports (the `DB::transaction()` wrapper
      is gone too — no longer needed for a single-table write). Response
      `receipt_voucher_id` is now always `null` (still present in the
      returned array — `CompletePaymentResDTO.receipt_voucher_id` is typed
      `?int`, so the key must exist even when null). Success message
      reworded from "reviewed and confirmed by the finance team" to
      "Your invoice will be updated once the finance team confirms this
      payment" — same meaning, no longer implies a specific ReceiptVoucher
      mechanism this code no longer performs.
- [x] `GetPaymentReceiptDataIntent.php` — removed the `ReceiptVoucher::find()`
      lookup and its import; `receipt_number` is now derived directly from
      the order (`"PGO-{$order->id}"`) instead of a voucher's serial number,
      since no voucher will ever exist to look up going forward.
- `php -l` clean on both files.

## Consequence, flagged not fixed

Reconciling a completed payment into the school's actual invoice/accounting
records (creating a ReceiptVoucher, updating an invoice balance) is now
entirely outside this module's responsibility — presumably a separate
finance/admin process reading `payment_gateway_orders` directly. That
process doesn't exist in this module and wasn't built here; not in scope of
what was asked.

## Verification

- `php -l` clean on both edited files.
- Re-swept the whole `PaymentGateway` module for `::create(`, `->save()`,
  `->update(`, `PaymentGatewaySetting::` after the edit — confirmed every
  remaining write targets `PaymentGatewayOrder` only, and
  `PaymentGatewaySetting` is read-only everywhere.
- **Not verified live** — same standing limitation as everything else this
  session. Before shipping: run one completed payment and confirm (a) no
  `receipt_vouchers` row gets created, (b) the app's receipt download still
  works using the new `PGO-{id}` receipt number, (c) the success screen's
  reworded message displays correctly.

---

# Plan: Discipline Marks Matrix Module — Backend (toyar-school-app-backend)

## Context

New module `modules/DisciplineManagement` (backend repo). User already created:
- `Database/Migrations/2026_08_24_000001_create_discipline_misconduct_levels_table.php`
  → table `discipline_misconduct_level` (level matrix, 1-5, admin-managed)
- `Database/Migrations/2026_08_24_000002_create_discipline_records_table.php`
  → table `discipline_record` (one row per incident)
- `Database/Seeders/DisciplineMisconductLevelSeeder.php` (seeds the 5 official levels)
- `Models/DisciplineMisconductLevel.php`, `Models/DisciplineRecord.php` (fillable +
  relationships already wired: `discipline_record_list`, `student`,
  `misconduct_level`, `reported_by_user`, `reviewed_by_user`)
- `Discipline-marks-info.md` — the spec doc (AI-agent prompt) with full domain
  rules, entity fields, approval workflow, and endpoint list.

Missing: everything that turns those tables into a working API — Intents
(controllers), Actions (business logic), DTOs (validation), routes, module
registration. This plan covers **backend only**, per current request; the
React Native screens from the spec doc are a separate follow-up.

### Codebase conventions confirmed by reading existing modules (not guessed)

- **No classic MVC.** This codebase uses `lorisleiva/laravel-actions`: each
  operation is a folder under `Intents/<Group>/<OperationName>/` containing
  an `...Intent` (HTTP entry point, wraps body in `DB::transaction`, formats
  the `{status,message,data,metadata}` JSON envelope), an `...Action`
  (business logic, callable directly by other Actions too), and
  Spatie-laravel-data DTOs: `...UserDTO` (validates raw request input),
  `...SystemDTO` (server-derived fields like `created_by`), and a final
  `...DTO` (merged, what actually gets persisted). Modeled directly on
  `AttendanceManagement/Intents/StudentAttendance/CreateStudentAttendance/*`
  and the live (non-backup) `CalendarManagement/Intents/Event/ApprovalEvent/*`
  for the approve pattern.
- **Routing**: each module has its own `routes.php` (all `POST`, kebab-case
  paths, `AuthGuard::class` middleware, one `Route::prefix()->group()` per
  entity) — see `AttendanceManagement/routes.php`. The module's routes file
  is wired in centrally at `bootstrap/app.php` with one
  `Route::prefix('api/<module-kebab>')->group(base_path('modules/<Module>/routes.php'))`
  line, and the module's ServiceProvider is registered with one line in
  `bootstrap/providers.php` — every existing module required both of these;
  there's no auto-discovery.
- **No tenant_id/school_id column anywhere.** Multi-tenancy is per-database
  (`AuthGuard` switches the `pgsqlt` connection to the school's own database
  per request) — confirmed by grepping every migration in `StudentManagement`
  and `AttendanceManagement`. So neither new table needs a tenant column
  (already correctly omitted from the migrations you wrote).
- **No backend role/permission gating found in any `Intent`** (grepped for
  `user_category`, `Gate::`, `->can(`, `403` across every module) — role
  restriction ("Management only", "Class Teacher or higher") is enforced by
  the frontend's navigation/menu visibility only, not the API. I'm matching
  that existing convention (auth-only via `AuthGuard`) rather than inventing
  a new backend permission layer for this module alone — flag if you want
  this module to be the first with real server-side role checks.
- **Student search**: `StudentManagement`'s existing
  `GetStudentListData` endpoint (`POST /api/student-management/get-student-list-data`)
  already supports `search_phrase` matched against `full_name` OR
  `admission_number` (ILIKE), plus grade/group filtering. Per the spec doc's
  explicit instruction to reuse this rather than duplicate it — **no new
  student-search endpoint will be built**; the future frontend calls this
  existing one directly.
- **Academic year**: no `academic_years` table or concept exists anywhere in
  the codebase (checked `AttendanceManagement`'s two academic-year-scope
  methods — those are query scopes, not a stored table). This module
  computes the academic year (Sep 1 → Aug 31) inline from `incident_date`,
  storing it as the plain string already in your migration
  (`discipline_record.academic_year`) — no new table.

## Files to add (all new — nothing existing is touched except the two
1-line registrations below)

```
modules/DisciplineManagement/
├── config.php
├── routes.php
├── Providers/DisciplineManagementServiceProvider.php
├── Support/DisciplineMarksCalculator.php   ← academic-year + remaining-marks
│                                              + conduct-rating-band logic,
│                                              the single source of truth
│                                              both the summary/dashboard
│                                              endpoints and (later) any
│                                              reporting code call into
├── Intents/
│   ├── MisconductLevel/
│   │   ├── CreateMisconductLevel/{Action,Intent,DTO,UserDTO,SystemDTO}.php
│   │   ├── UpdateMisconductLevel/{...same 5 files}
│   │   ├── DeleteMisconductLevel/{...}        (soft delete: is_active=false)
│   │   └── GetMisconductLevelListData/{Action,Intent,UserDTO}.php
│   └── DisciplineRecord/
│       ├── CreateDisciplineRecord/{Action,Intent,DTO,UserDTO,SystemDTO}.php
│       ├── UpdateDisciplineRecord/{...}       (blocked unless status=Pending)
│       ├── DeleteDisciplineRecord/{...}       (soft delete: is_active=false)
│       ├── ApproveDisciplineRecord/{Action,Intent,DTO,UserDTO,SystemDTO}.php
│       ├── RejectDisciplineRecord/{...same shape as Approve}
│       ├── GetDisciplineRecordListData/{Action,Intent,UserDTO}.php   (grade/
│       │                                    academic_year/status filters,
│       │                                    paginated — staff list/dashboard)
│       ├── GetStudentDisciplineSummary/{Action,Intent,UserDTO}.php   (remaining
│       │                                    marks, rating band, current AY,
│       │                                    full record history + prior-year
│       │                                    toggle for one student)
│       └── GetDisciplineGradeDashboard/{Action,Intent,UserDTO}.php   (grade +
│                                            academic_year → rating-band
│                                            distribution + drill-down list)
```

## Key business logic (in `Support/DisciplineMarksCalculator.php`)

- `academicYearForDate(Carbon $date): string` — Sep 1→Aug 31 rule (e.g.
  2025-09-01..2026-08-31 = `"2025-2026"`).
- `remainingMarks(int $studentId, string $academicYear): int` —
  `100 - SUM(marks_deducted WHERE status='Approved')` for that student+year,
  floored at 0. Computed on every read, never stored — matches the doc's
  explicit "don't store remaining marks as a writable field" rule.
- `conductRating(int $remainingMarks): string` — the 6-band lookup table
  from the doc (95-100 Outstanding … below 60 Serious Improvement Required).

## Approval workflow (in `CreateDisciplineRecordAction`)

1. Look up the selected `DisciplineMisconductLevel`; validate
   `marks_deducted` falls within its `indicative_deduction_min/max` —
   if outside range, require `override_reason` to be non-empty (matches the
   doc's "override with reason" rule, and the `override_reason` column you
   already added to the migration) rather than hard-blocking.
2. Snapshot `grade_class_at_time` from the student's current
   `grade_level_class` at creation time.
3. Route by the level's `approval_tier` column (already in your migration,
   1/2/3 matching Level 1 / Level 2 / Level 3-5 from the doc):
   - tier 1 → `status = 'Approved'` immediately, `reviewed_by` = creator,
     `reviewed_date` = today.
   - tier 2/3 → `status = 'Pending'`, `reviewed_by`/`reviewed_date` left null.
4. `ApproveDisciplineRecord` / `RejectDisciplineRecord` are separate
   endpoints (never via the general update endpoint) — sets `status`,
   `reviewed_by`, `reviewed_date`; only callable while the record is
   currently `Pending`.

## Registration (the only touches to existing files — both are the same
one-line addition every other module already required, no logic changed)

- [ ] `bootstrap/providers.php` — add
      `Modules\DisciplineManagement\Providers\DisciplineManagementServiceProvider::class,`
- [ ] `bootstrap/app.php` — add
      `Route::prefix('api/discipline-management')->group(base_path('modules/DisciplineManagement/routes.php'));`

## Decisions (confirmed by user via AskUserQuestion, 2026-09-09)

1. **Reject reason**: skip it — no new `review_note` column.
   `ApproveDisciplineRecord`/`RejectDisciplineRecord` set only `status` +
   `reviewed_by` + `reviewed_date`.
2. **Update endpoint scope while Pending**: editing every user-supplied
   field (offence, description, incident_date, marks_deducted,
   misconduct_level_id, disciplinary_action_taken, parent_informed,
   student_response) except `student_id`/`reported_by`/`status`, blocked
   once the record is no longer `Pending`.
3. **Delete**: soft delete only (`is_active=false`). No dedicated
   `DisciplineLog` — audit trail is the existing
   `created_by`/`updated_by`/`reported_by`/`reviewed_by` columns.
4. **Proceed**: user confirmed — building now.

## Review

Implemented exactly as planned — 12 endpoints across 2 entities, all new files
except the two 1-line registrations.

**New files (59 PHP files total under `modules/DisciplineManagement/`)**:
- `Support/DisciplineMarksCalculator.php` — academic-year (Sep 1→Aug 31),
  remaining-marks (computed, never stored), and conduct-rating-band logic.
- `Intents/MisconductLevel/{Create,Update,Delete,GetMisconductLevelListData}/*`
  — admin CRUD for the level matrix (soft delete via `is_active`).
- `Intents/DisciplineRecord/{Create,Update,Delete,Approve,Reject,
  GetDisciplineRecordListData,GetStudentDisciplineSummary,
  GetDisciplineGradeDashboard}/*` — full incident CRUD + approval workflow +
  the two read endpoints for the future student-profile and grade-dashboard
  screens.
- `routes.php`, `config.php`, `Providers/DisciplineManagementServiceProvider.php`.

**Business logic implemented**:
- `CreateDisciplineRecordAction` — validates `marks_deducted` against the
  selected level's range (requires `override_reason` if outside it),
  snapshots `grade_class_at_time` from the student's current class, derives
  `academic_year` from `incident_date`, and auto-approves when the level's
  `approval_tier === 1` (else `status = 'Pending'`).
- `UpdateDisciplineRecordAction` — blocked once `status !== 'Pending'`.
- `Approve`/`RejectDisciplineRecordAction` — separate endpoints, only
  operate on `Pending` records, never touch fields outside status/reviewed_*.
- `GetStudentDisciplineSummaryAction` — remaining marks, conduct rating,
  current-year record list, and the list of prior academic years the
  student has records in (for a frontend year-toggle).
- `GetDisciplineGradeDashboardAction` — per-class remaining marks/rating for
  every active student in the given `grade_level_class_ids`, plus an
  aggregate band-distribution count, in one query (not N+1).

**Registration** (only touches to existing files, both 1-line additive):
- `bootstrap/providers.php` — added `DisciplineManagementServiceProvider::class`.
- `bootstrap/app.php` — added the `api/discipline-management` route-prefix line.

**Verification**:
- `php -l` clean on all 59 new/modified files.
- `composer dump-autoload` + `php artisan route:list --path=discipline` —
  ran against the real booted app (not just syntax-checked): all 12 routes
  registered correctly with no naming conflicts or autoload errors, confirming
  the ServiceProvider registration and `Modules\` PSR-4 mapping both resolve.
- **Not verified**: no live request was made (no test DB session/auth token
  available in this environment) — the routes are registered but the actual
  Create → Approve/Reject → Summary/Dashboard flow against the real
  `pgsqlt` tenant connection hasn't been exercised. Recommend a quick manual
  Postman/Insomnia pass (or a Jest-equivalent Feature test, matching
  `AttendanceReasonCRUDTest.php`'s pattern) before wiring the frontend.
- **Not done** (explicitly out of scope per user's "backend only" request):
  React Native screens from `Discipline-marks-info.md` §"FRONTEND — SCREENS
  TO BUILD" — separate follow-up.
- Remember to run
  `php artisan db:seed --class="Modules\DisciplineManagement\Database\Seeders\DisciplineMisconductLevelSeeder"`
  if the 5 official levels aren't in the DB yet (the seeder file already
  existed before this session, untouched).

## Follow-up: Frontend — read-only Discipline section on parent Student Profile

User asked for a new section on
`src/screens/authenticated/parent/student-profile-new/StudentProfileMain.js`
(the parent-facing student profile screen) showing that student's discipline
data only — remaining marks, conduct rating, and record history — filterable
by academic year, defaulting to the newest year. Explicitly no add/delete
UI (read-only), clean UI matching the existing sections (Achievements &
Badges, Academic Cards) on that same screen.

### Changes

- [x] `src/api/discipline-management-api.ts` (new file) — RTK Query
      `useGetStudentDisciplineSummaryQuery({ student_id, academic_year? })`
      wrapping the backend's `get-student-discipline-summary` endpoint (built
      in the backend plan above), matching the existing per-module API file
      pattern (`student-achievement-api.ts` as the closest template). Also
      exports `getConductRatingColor`/`getDisciplineStatusColor`/
      `formatDisciplineDate` UI helpers, following the same
      "utilities live next to the api file" convention as `attendance-api.ts`.
- [x] `src/api/api-server-1.ts` — added `"DisciplineSummary"` to the shared
      `tagTypes` array (1-line additive, same as every other API module
      registers its own tag).
- [x] `StudentProfileMain.js` — new "Discipline Record" section inserted
      between the Achievements & Badges section and the Academic Cards
      (Exams/Attendance) row:
  - Horizontal academic-year filter chips built from the response's
    `available_academic_years` (already ordered newest-first by the
    backend); tapping a chip re-queries that year. No selection defaults to
    the backend's own default (current/newest academic year), matching "show
    newest year by default" without extra client logic.
  - Summary card: `remaining_marks / baseline_marks` + a colored conduct
    rating badge.
  - Record list: offence, misconduct level name, date, marks deducted
    (red, prefixed `-`), and a colored status pill (Approved/Pending/
    Rejected). Read-only — no create/edit/delete affordance anywhere in this
    section, per the request.
  - Loading/error/empty states styled to match the existing Achievements
    section's loading/error/empty patterns on the same screen.
  - `selectedDisciplineYear` state resets to `null` (→ newest year) in the
    existing "reset on student change" `useEffect`, alongside the other
    per-student UI resets already there.

### Verification

- `npx tsc --noEmit` — no errors in the new `discipline-management-api.ts`;
  the one pre-existing `DisciplineSummary`-mentioning error is in
  `UniversalSchoolCalendar.tsx` (an untouched file, unrelated `unknown` state
  type issue that already existed — the new tag just now appears inside that
  error's printed type union).
- `npx eslint` clean on all three touched/new files (fixed one prettier
  formatting nit and one unused-catch-binding warning along the way).
- `npx expo export --platform web` — production bundle builds successfully
  with the new section wired in; verification build output deleted after
  (`dist/` isn't gitignored in this repo, so it was removed rather than left
  as an untracked artifact).
- **Not verified visually** — no simulator/device in this environment to
  actually see the rendered section, confirm the year-chip interaction feels
  right, or confirm colors/spacing read as "clean" in practice. Please check
  on a real device/simulator, especially: chip row scrolling with 3+ years,
  the empty-state copy for a student with a completely clean record, and
  that the status pill colors are distinguishable at a glance.

## Follow-up 2: Move Discipline data into a popup drawer + modernize UI

User: don't show the discipline data (summary + record list) inline at the
bottom of the profile page — clicking the Discipline section should open a
popup modal instead, matching how Exams/Attendance/Analytics already work on
this same screen. Also wanted a more modern UI. Re-checked the existing
drawer components (`AllBadgesDrawer.tsx` as the closest template — same
maroon header + close button + `ScrollView` pattern already established) and
how the other three cards on this screen (`ExamsDrawer`, `StudentAttendance`,
`StudentAnalyticsDrawer`) are all opened from a plain nav-tile with no live
data pre-fetched on the tile itself — matched that exact pattern instead of
inventing a new one.

### Changes

- [x] `src/screens/authenticated/parent/student-profile-new/StudentProfileMain.js`
      — removed the inline discipline section entirely (query hook, year-filter
      state, JSX, and all `discipline*`-prefixed styles). Added a 4th nav card
      to the existing `academicCardsSection` row (same `academicCard` style as
      Exams/Student Attendance — icon, title, subtitle, chevron) labeled
      "Discipline Record", and a `showDisciplineDrawer` state + full-screen
      `Modal` rendering the new drawer, wired identically to how
      `StudentAnalyticsDrawer` is opened.
- [x] `src/components/common/drawer/DisciplineRecordDrawer.tsx` (new file) —
      self-contained drawer component (owns its own
      `useGetStudentDisciplineSummaryQuery` call and academic-year filter
      state, following the same "drawer fetches its own data" convention as
      `StudentAttendanceDrawer`/`StudentAnalyticsDrawer` rather than the
      parent screen). Modernized visual design vs. the removed inline version:
  - Maroon header matching `AllBadgesDrawer`'s established drawer chrome
    (close button, centered title + student name subtitle).
  - Hero summary card: large remaining-marks number, conduct-rating badge,
    and a colored progress bar (`remaining/baseline` as a fill width) — new,
    wasn't in the inline version.
  - Horizontal academic-year filter chips (moved from the old inline
    section, same newest-year-by-default behavior).
  - Record history as individual rounded cards with a colored left accent
    bar keyed to the misconduct level (1=green → 5=red, new
    `getMisconductLevelColor` helper), rather than the old flat divided-row
    list — includes the incident description text, which the inline version
    didn't show.
- [x] `src/api/discipline-management-api.ts` — added `getMisconductLevelColor`
      export (1-5 → green...red) for the new record-card accent bar.

### Verification

- `npx eslint` clean on all three touched/new files (two prettier nits
  auto-fixed).
- `npx tsc --noEmit` — no new errors; same single pre-existing unrelated
  error in `UniversalSchoolCalendar.tsx` as before (untouched file).
- `npx expo export --platform web` — production bundle builds successfully;
  verification `dist/` output deleted after (not gitignored in this repo).
- **Not verified visually** — same standing limitation, no simulator/device
  in this environment. Please check on a real device: the modal open/close
  transition, the progress-bar fill rendering at 0% and 100%, and that the
  four academic-card tiles (Exams/Attendance/Discipline + the commented-out
  one) still lay out and wrap sensibly with one more entry in the row.

## Follow-up 3: Tap a record for full details (was summarized-only)

User: the record cards in the drawer only showed summarized data (offence,
level, date, truncated description, status) — tapping one should open a
popup showing the record's full details.

### Changes

- [x] `src/api/discipline-management-api.ts` — `DisciplineRecordItem` was
      missing two fields the backend actually returns (confirmed by
      re-reading `GetStudentDisciplineSummaryAction.php` on the backend: it
      queries `DisciplineRecord::...->get()` with no `->select()`, so every
      column comes back, not just the ones the old interface declared).
      Added `override_reason: string | null` and
      `reviewed_date: string | null` so the detail popup can show them.
- [x] `DisciplineRecordDrawer.tsx`:
  - Each record card is now a `TouchableOpacity` (was a plain `View`) that
    sets `selectedRecord` on press; added a small "View details ›" hint next
    to the status pill so it's discoverable as tappable, and truncated the
    inline description to 2 lines (was 3) since the popup now carries the
    full text.
  - New record-detail `Modal` (transparent overlay, centered card, own close
    button) showing every field on the record: misconduct level, incident
    date, academic year, grade/class at the time, full description,
    disciplinary action taken, override reason (only when the deduction was
    outside the level's range), parent-informed yes/no, student response,
    reported-by and reviewed-by names, and reviewed date. Built via a small
    local `DetailRow` component that renders nothing for a field that's
    `null`/empty, so students with sparser records don't show a wall of
    blank rows.

### Verification

- `npx eslint` clean (one prettier nit auto-fixed).
- `npx tsc --noEmit` caught a real bug before it shipped: the detail modal's
  level-color dot read `selectedRecord?.misconduct_level?.level_number`
  where `selectedRecord` can be `null`, making the value
  `number | undefined` against `getMisconductLevelColor(level: number)`.
  Fixed with `?? 0`. Confirmed clean afterward — same single pre-existing
  unrelated `UniversalSchoolCalendar.tsx` error as every prior pass.
- `npx expo export --platform web` — production bundle builds successfully;
  verification `dist/` output deleted after.
- **Not verified visually** — same standing limitation. Please check on a
  device: the detail modal opening over the already-open drawer Modal
  (nested `Modal`s — same pattern this codebase already uses for the badge
  detail popup, but worth confirming it renders above the drawer and not
  behind it on both iOS and Android), and that a record with no
  description/override_reason/student_response shows a sensibly short list
  rather than empty gaps.

---

# Plan: Header student data — fresh fetch on app load (critical, production)

## Context

Goal (user): on every app load, use the already-stored global `selectedStudent`
id to fetch **fresh** student data from the backend for the header, instead of
relying on data cached at login time. One-time fetch on app load, not
real-time/websocket. Keep the existing "selected student id" storage mechanism
exactly as-is. Scoped strictly to the header and its own data-fetching — no
other section should be touched.

## Findings (read-only investigation, nothing changed yet)

1. **`src/components/HeaderAuthenticated.tsx`** reads `selectedStudent` /
   `sessionData` from `useSelector((state) => state.app)` and dispatches
   `setSelectedStudent` (from `src/state-store/slices/app-slice.ts`) when a
   student is picked. **The picker modal's student list is currently
   hardcoded mock data** (`mockStudents`, 3 fake students) — there is no
   "relogin dependency" bug in the sense of a broken refresh; there's simply
   no real data source wired in at all yet.
2. **Real per-parent student data already exists**, just unused: the login
   response (`src/app/public/login.tsx:157-167`, mirrored in the legacy
   `src/app/__login.tsx`) dispatches `setSessionData(enhancedSessionData)`,
   which contains `sessionData.data.student_list` — a full array of the
   parent's real children (typed as `Student[]` in `src/types/auth.ts:114-188`).
   Nothing today reads this array into `selectedStudent`.
3. **A ready-made transformer already exists and is already correct**:
   `src/utils/studentProfileUtils.js` exports
   `transformStudentWithProfilePicture(student, sessionData)`, which converts
   a raw backend `Student` object into exactly the shape
   `state.app.selectedStudent` / `HeaderAuthenticated` / the drawers expect
   (`id`, `student_calling_name`, `profileImage`, `grade`, `class_id`,
   `guardianInfo`, etc. — matches the `SelectedStudent` interface in
   `app-slice.ts:13-29`). It is currently **unused** (dead code, because
   nothing calls it with real data). This plan reuses it as-is — no changes
   to this file.
4. **Downstream consumers of `selectedStudent` that must keep working
   unchanged**: `src/components/common/drawer/ExamsDrawer.tsx` and
   `ReportCardsDrawer.tsx` both read `selectedStudent?.id` and pass it as
   `studentId` into their own RTK Query calls. As long as the object we
   dispatch into `setSelectedStudent` keeps the same field names/shapes
   `transformStudentWithProfilePicture` already produces, these are
   unaffected — confirmed no changes needed there.
5. **No existing "get my children" or safe "get one student by id" backend
   endpoint.** `src/api/student-management-api.ts`'s `getStudentList` is a
   school-wide paginated directory (unused in the app) — not scoped to a
   parent's own children, wrong shape for this. Backend-side,
   `GetStudentByIdIntent` (`POST /api/student-management/student/get-student-by-id`)
   exists but (a) performs **no ownership check** — any authenticated user of
   any role can fetch any `student_id` — and (b) doesn't return
   attachment/guardian_info fields the header transformer needs. Per your
   decision, a **new additive backend endpoint** will be built instead of
   reusing or editing this one, with a guardian-ownership check modeled on
   the existing pattern in `InitiatePaymentSessionIntent.php:53-66`
   (`UserPaymentStudent` / `user_payment.user_id` check), the same check
   `SignInIntent.php` already relies on to build `student_list` in the first
   place.
6. **Best existing hook point for "run once per app load, only for logged-in
   users"**: `src/app/authenticated/_layout.tsx` already does exactly this
   for payment-status checking — `usePaymentStatusChecker()` fires from a
   `useEffect` on mount, reading `token`/`isAuthenticated`/`sessionData` from
   redux. The new header-sync hook will follow the identical pattern, mounted
   alongside it in the same file.
7. **Redux persistence**: `state.app` (holding `selectedStudent`,
   `sessionData`) persists to AsyncStorage across restarts (confirmed in
   `store.ts` — no whitelist, only the 4 RTK Query API reducers are
   blacklisted). RTK Query's own cache (`apiServer1` reducer) IS blacklisted,
   so a new RTK Query endpoint's cache does **not** survive an app restart —
   meaning every app load naturally gets a real network call, no extra
   "force refetch" logic required.

## Scope decisions (confirmed with user)

- **Picker wired to real data**: `HeaderAuthenticated.tsx`'s mock student
  list is replaced with `sessionData.data.student_list` (already in redux
  from login — no new API call for the list itself). Without this, the new
  fetch-by-id logic would only ever run against fake ids in production.
- **New backend endpoint includes a guardian-ownership check** — closes the
  gap in `GetStudentByIdIntent` rather than copying it into a second
  endpoint.

## Architecture

### 1. Backend (new, additive only — no existing files edited)

New Intent under the existing `StudentManagement` module (matches its
existing `student` route-prefix group in `modules/StudentManagement/routes.php`,
one new line added there — the same kind of one-line additive registration
used for the Discipline module above):

- `modules/StudentManagement/Intents/Student/GetStudentHeaderData/` —
  `GetStudentHeaderDataIntent.php`, `GetStudentHeaderDataAction.php`,
  `GetStudentHeaderDataUserDTO.php`.
- **Request**: `POST /api/student-management/student/get-student-header-data`
  `{ student_id: number }`.
- **Authorization**: verifies `student_id` belongs to the authenticated
  guardian via `UserPaymentStudent::where('student_id', ...)->where('is_active', true)->whereHas('user_payment', fn($q) => $q->where('user_id', $user->id)...)->exists()`
  (same pattern as `InitiatePaymentSessionIntent.php`); returns 403 if not
  owned, matching the existing `abort(403, 'Invalid student.')` convention.
- **Response shape**: mirrors the same student fields `SignInIntent.php`
  already assembles into `student_list` (so the frontend's existing
  `transformStudentWithProfilePicture()` can consume it unmodified) — `id`,
  `admission_number`, `full_name`, `student_calling_name`, `grade_level`,
  `grade_level_class`, `school_house`, `guardian_info`, `attachments`
  (or `student_attachment_list`), `date_of_birth`, `gender`. Reuses the same
  eager-load relations `SignInIntent.php` already loads — no new query
  pattern invented.
- Nothing in `GetStudentByIdIntent.php` or any other live endpoint file is
  touched.

### 2. Frontend — new, separate module (not merged into student-list logic)

- **`src/api/student-header-api.ts`** (new file) — one RTK Query endpoint,
  `.injectEndpoints()` onto the existing `apiServer1` base (same convention
  as every other `*-api.ts` file, same auth-header injection, same base
  URL). `useLazyGetStudentHeaderDataQuery({ student_id })`.
- **`src/hooks/useHeaderStudentSync.ts`** (new file) — modeled directly on
  `usePaymentStatusChecker.ts`:
  - Reads `selectedStudent?.id` and `token`/`isAuthenticated` from
    `state.app` via `useSelector` — **read-only**, does not alter how/where
    `selectedStudent` is stored.
  - If no `selectedStudent?.id`, does nothing (nothing to refresh yet — first
    pick still goes through the now-real picker).
  - Otherwise calls the new lazy query with `{ student_id: selectedStudent.id }`.
  - On success: passes the response through the existing
    `transformStudentWithProfilePicture(data, sessionData)` and dispatches
    the existing `setSelectedStudent(...)` action — same action, same
    reducer, same shape as today; only the source of the payload changes
    from "mock click" to "fresh backend data."
  - On failure (offline blip, timeout, 403): **logs the error and leaves the
    current persisted `selectedStudent` untouched** — the header keeps
    showing the last-known-good (cached-at-login-or-previous-session) data
    rather than blanking out or crashing. This is the "not real-time"
    requirement translated into a safe failure mode.
- **`src/app/authenticated/_layout.tsx`** — one new line: call
  `useHeaderStudentSync()` alongside the existing
  `usePaymentStatusChecker()`, same file, same mount point, same lifecycle
  (only for authenticated users, once per app load). This is the only edit
  to an existing file on the frontend side besides `HeaderAuthenticated.tsx`
  itself.
- **`src/components/HeaderAuthenticated.tsx`** — the picker modal's
  `mockStudents` array is replaced with `sessionData.data.student_list`
  (already in redux, no new fetch). `handleStudentSelect` continues to call
  `transformStudentWithProfilePicture` + `setSelectedStudent` exactly as the
  new hook does, so a manual pick and an app-load refresh produce identically
  shaped data.

### What is explicitly NOT touched

- `app-slice.ts` — no new reducers/state fields; `setSelectedStudent`,
  `selectedStudent`'s shape, and its persistence behavior are all unchanged.
- `ExamsDrawer.tsx`, `ReportCardsDrawer.tsx`, `student-selection-middleware.ts`
  — all continue reading `selectedStudent` exactly as before; the object
  shape they depend on (`.id`) is preserved.
- The existing `getStudentList` school directory endpoint/usage, login flow,
  `sessionData` construction, token handling, redux-persist config — all
  untouched.
- `GetStudentByIdIntent.php` and every other live backend endpoint file —
  untouched; only new files added plus one new route line in
  `modules/StudentManagement/routes.php` and one new provider/route
  registration line if a fresh module were needed (not needed here — this
  rides on the existing `StudentManagement` module's registration).

## Rollback plan

- Frontend: the two new files (`student-header-api.ts`,
  `useHeaderStudentSync.ts`) plus three one-line touch points
  (`_layout.tsx`'s hook call, `HeaderAuthenticated.tsx`'s mock-array swap) —
  reverting is a straightforward `git revert` of one commit; nothing else in
  the app depends on these new files existing.
- Backend: new endpoint is fully additive (new folder, one new route line);
  disabling it is either removing that one route line or simply having the
  frontend hook stop calling it — the rest of the backend is unaffected
  either way.
- If the new fetch misbehaves in production (wrong data, unexpected 403s,
  crashes), the safe interim mitigation is commenting out the single
  `useHeaderStudentSync()` call in `_layout.tsx` — the app reverts instantly
  to today's behavior (manual picker only, real data now instead of mock,
  no auto-refresh) without touching redux, drawers, or any other screen.

## Todo

- [x] Backend: `GetStudentHeaderDataIntent`/`Action`/`UserDTO` (new files) +
      one new route line in `modules/StudentManagement/routes.php`, with
      guardian-ownership check.
- [x] Frontend: `src/api/student-header-api.ts` (new RTK Query endpoint).
- [x] Frontend: `src/hooks/useHeaderStudentSync.ts` (new hook, mirrors
      `usePaymentStatusChecker` pattern).
- [x] Frontend: wire `useHeaderStudentSync()` into
      `src/app/authenticated/_layout.tsx`.
- [x] Frontend: replace `mockStudents` in `HeaderAuthenticated.tsx` with
      `sessionData.data.student_list`.
- [x] Verify: `tsc --noEmit` / `eslint` clean; `php -l` clean on new backend
      files.
- [ ] Manual test (needs device/simulator + real login): log in as a parent
      with 2+ children, pick a student in the header, force-quit and
      relaunch the app, confirm the header shows fresh data for the
      previously-selected student without requiring re-login; confirm
      `ExamsDrawer`/`ReportCardsDrawer` still work unchanged; confirm a
      guardian cannot fetch another guardian's child's data (403 test).

## Review

Implemented exactly as planned. Before writing code, re-verified the
"connected students" ownership query directly against `SignInIntent.php` and
`GetStudentListByUserAction.php` (the two places that already build the
login-time `student_list`) rather than trusting the earlier research pass —
both use the identical predicate: `UserPaymentStudent.is_active = true` AND
`UserPayment.is_active = true` AND `UserPayment.user_id = $user->id`. The new
endpoint's ownership check uses this exact same predicate, so it can only
ever return a student that would already appear in that guardian's own
`student_list` — confirmed, not assumed.

**Backend** — 3 new files under
`modules/StudentManagement/Intents/Student/GetStudentHeaderData/`
(`Intent`/`Action`/`UserDTO`) + 2 additive lines in the existing
`modules/StudentManagement/routes.php` (one `use` import, one `Route::post`
inside the pre-existing `student` prefix group). New route:
`POST /api/student-management/student/get-student-header-data`. Returns 403
(`This student is not linked to your account.`) if the ownership check
fails, 404 if the student row doesn't exist — the `Intent` explicitly
preserves `HttpException` status codes instead of flattening everything to
400 like its sibling `GetStudentByIdIntent` does, since this endpoint's
whole purpose is the ownership boundary. `GetStudentByIdIntent.php` and
every other live endpoint: untouched.

**Frontend** — 2 new files (`src/api/student-header-api.ts`,
`src/hooks/useHeaderStudentSync.ts`) + 2 small edits to existing files
(`src/app/authenticated/_layout.tsx`: one new hook call;
`src/components/HeaderAuthenticated.tsx`: mock student array replaced with
the real `sessionData.data.student_list`, `handleStudentSelect` now runs the
picked student through the already-existing `transformStudentWithProfilePicture()`
before dispatching). `useHeaderStudentSync` mirrors `usePaymentStatusChecker`'s
exact shape (same file, same mount point, same "fires once per authenticated
app load via `useEffect`" pattern) — reads `selectedStudent?.id` read-only,
fetches fresh data, and dispatches the pre-existing `setSelectedStudent`
action so downstream consumers (`ExamsDrawer`, `ReportCardsDrawer`,
`student-selection-middleware.ts`) see no shape change. On fetch failure, it
logs and leaves the persisted `selectedStudent` alone rather than blanking
the header.

**Verification**:
- `php -l` clean on all 3 new backend files and the edited `routes.php`.
- `tsc --noEmit`: confirmed zero errors in any touched/new file by grepping
  the full project error list for each filename — every remaining error is
  pre-existing and unrelated (`paymentSlice.ts`,
  `educatorFeedbackSliceWithAPI.ts`, `studentGrowthTransform.ts`, a test
  file, `student-selection-middleware.ts`'s own pre-existing type error).
- `eslint --fix` on all touched/new files — clean; the only changes it made
  were prettier formatting (multi-line object/import wrapping,
  `Array<T>` → `T[]`), no logic touched.
- **Not verified live**: no device/simulator or backend deploy access in
  this environment. Before relying on this in production: deploy the new
  backend route, log in as a real parent account with 2+ children, confirm
  the picker shows real children (not the old Emma/Michael/Sarah mocks),
  pick one, force-quit and relaunch the app, and confirm the header shows
  fresh data for the previously-selected student without needing to log in
  again. Also confirm `ExamsDrawer`/`ReportCardsDrawer` still work
  (`selectedStudent.id` unchanged in shape), and confirm requesting a
  `student_id` that isn't actually linked to the logged-in guardian returns
  403, not the student's data.

## Correction (same day): wrong header file initially targeted, timing bug found

User tested and saw no change, and correctly identified that
`src/components/HeaderAuthenticated.tsx` (edited above) is **not** the real
header — grepped and confirmed it has zero real imports anywhere in the app
(one hit in `AddAttendanceModal.tsx` was just a code *comment*, not an
import). The actual header rendered on every parent screen is
`src/components/common/Header.js`, imported by all 9 files under
`src/screens/authenticated/parent/`.

- **Good news, no fix needed there**: `Header.js` was already reading its
  student picker from real backend data (`sessionData.data.student_list`,
  not mock) before this session touched anything — the "mock student list"
  problem only ever existed in the dead `HeaderAuthenticated.tsx`.
- **Real bug found**: `useHeaderStudentSync.ts`'s `useEffect` originally
  fired only on `[token, isAuthenticated]`. On a fresh login,
  `selectedStudent` is still `null` at that exact moment — `Header.js`'s own
  auto-select effect (`Header.js:878-906`) only sets it moments later. The
  hook had already run-and-exited by then and never re-checked, so it
  silently did nothing for the rest of that session. Fixed: added
  `selectedStudent?.id` to the effect's dependency array, so it also fires
  the moment an id first becomes selected (covers both a
  persisted-from-last-session id and a freshly auto-selected one). A
  successful fetch redispatches the same id, so this doesn't loop.
- Because `useHeaderStudentSync()` is mounted at
  `src/app/authenticated/_layout.tsx` (wraps every authenticated screen,
  `Header.js` included) and only ever touches redux (`setSelectedStudent`),
  no code change was needed inside `Header.js` itself — the fix belongs
  entirely in the hook.
- `HeaderAuthenticated.tsx`'s earlier edit (mock → real picker data) is
  harmless dead code now — left as-is rather than reverted, since it's an
  improvement in isolation and touching it further isn't needed.
- `eslint`/`tsc --noEmit` clean on the re-edited hook file.
- **Still unverified live**: same standing limitation. The most likely
  reason nothing changed in the user's test is that the new backend route
  hasn't been deployed yet (SFTP upload + `composer dump-autoload` — see
  "Go-live" deploy-note pattern used elsewhere in this file); this timing
  fix is a second, independent issue that would have blocked it even after
  deployment.

## Follow-up: student picker now fetches fresh on open (not login-cached)

User: the "select student" window itself should load its list from the
backend at the moment it's opened, not from the data cached at login
(`sessionData.data.student_list`).

**Found a reusable, safe building block already in the backend** —
`GetStudentListByUserAction` (`modules/UserManagement/Intents/User/GetPublicStudentList/GetStudentListByUserAction.php`)
already contains the exact "connected students" query logic (identical to
`SignInIntent.php`), taking a `User` model directly with no ownership
ambiguity. Its sibling `GetPublicStudentListIntent.php`, however, resolves
that `User` from a **client-supplied `user_id` in the request body** and
isn't registered in any `routes.php` — i.e. currently dead code, but an IDOR
waiting to happen if it were ever routed as-is. Did not touch or route it.

### Changes

- `toyar-school-app-backend/modules/UserManagement/Intents/User/GetMyStudentList/GetMyStudentListIntent.php`
  (new file) — thin controller that calls the existing, safe
  `GetStudentListByUserAction::run($request->user())`, resolving the user
  from the AuthGuard-authenticated request instead of a client-supplied id.
  A guardian can only ever get their own children through this endpoint.
- `modules/UserManagement/routes.php` — 2 additive lines: one `use` import,
  one `Route::post('/get-my-student-list', ...)` inside the existing
  `user` prefix group. New route:
  `POST /api/user-management/user/get-my-student-list` (no body needed).
- `src/api/student-header-api.ts` — added `getMyStudentList` (void-arg
  query) alongside the existing single-student endpoint; same file since
  both serve the same "fresh header/picker data, not login-cached" feature.
- `src/components/common/Header.js`:
  - `handleDropdownPress` now also calls `fetchMyStudentList()` (a
    `useLazyGetMyStudentListQuery` trigger) every time the picker opens —
    lazy queries always issue a fresh request by default, so this is never
    served from an app-session cache.
  - New `pickerStudents` (fresh data, transformed via the existing
    `transformStudentWithProfilePicture`) replaces `transformedStudents`
    (login-cached) as the modal's data source — search filtering now runs
    over `pickerStudents`. Everywhere else in the header (top-bar current
    student, badge count) still reads the cached `transformedStudents`,
    unaffected — scoped to "that student select section" only, per the
    user's own framing.
  - Modal now has 3 explicit states beyond the existing list/no-match/no-
    students-at-all ones: loading spinner, and an error state with a Retry
    button that re-triggers the same fetch — deliberately does **not** fall
    back to the cached login list on error, since the user explicitly didn't
    want login-cached data shown.

### Verification

- `php -l` clean on both new/edited backend files.
- `tsc --noEmit`: zero errors in `student-header-api.ts`.
- `eslint` clean on both touched files except 2 pre-existing duplicate
  style-key errors in `Header.js` that predate this session (confirmed
  present in the file before any of today's edits).
- **Not verified live**: same standing limitation as the rest of this
  feature — needs the backend deployed (this adds one more file + one more
  route line to the same pending SFTP upload) and a real device test:
  open the picker, confirm a network request fires each time (not served
  from cache on a second open), confirm Retry works after a simulated
  failure, and confirm picking a student from the fresh list still updates
  the header/drawers exactly as picking from the old cached list did.

---

# Plan: Educator Discipline Management section + gated access table + parent push notification + unread indicator

## Context

Follow-up to the Discipline Marks Matrix backend/frontend work above. User wants,
on `EducatorDashboardMain.tsx`:

1. A new **Discipline Management** section where an educator can create, edit,
   delete, and approve/decline discipline records (the `Pending`-status queue
   built earlier).
2. That section must be **visible only to specific user accounts** — not
   role-based, a literal per-user allowlist stored in a new DB table, and the
   user explicitly wants that table **designed to be reusable for gating
   other future sections too**, not single-purpose to discipline.
3. When a discipline deduction is **approved**, **push-notify the student's
   parent** — resolve the parent's user account from the student record, reuse
   the existing notification/push infrastructure.
4. If the parent hasn't opened/read that notification yet, show a **red dot**
   on the (already-built) parent-side "Discipline Record" button.

## Research findings (grounded in the actual code, not assumed)

- **No existing per-user or role-based section-gating mechanism anywhere.**
  `Spatie\Permission\PermissionServiceProvider` is registered in
  `bootstrap/providers.php` but grepping the whole codebase for
  `HasRoles`/`assignRole`/`hasRole`/`Role::` found zero real usage — it's an
  installed-but-unused dependency. Building the custom table the user asked
  for is the right call here, not fighting an unused framework feature.
- **A full notification + push system already exists and is reusable as-is**
  (`modules/CommunicationManagement`):
  - `NotificationService::sendModuleNotification($title, $message,
    $recipientUserIds, $type, $priority, $actionUrl)` — literally documented
    in its own docblock as "Generic reusable method for sending notifications
    from any module". This is exactly what the discipline module should call;
    no new push-delivery code needed.
  - `NotificationRecipient.is_read`/`read_at` already gives per-user read
    tracking — the "red dot if unread" requirement is already backed by this,
    no new read-tracking table needed either.
  - `SendPushNotificationJob` + `ExpoPushNotificationService` handle the
    actual device push once a `Notification`+`NotificationRecipient` row
    exists — triggered automatically inside `sendNotification()`.
  - Existing `NotificationType` seeder has an `alert` type (red,
    exclamation-triangle icon) that fits a discipline notice semantically —
    reusing it avoids a new migration just for a notification type.
- **Resolving a student's parent user account**: `Student` has `father()`,
  `mother()`, `guardian()` (`BelongsTo StudentGuardian`), and
  `StudentGuardian.user_id` is the linked parent's user account (nullable —
  not every guardian has registered/logged in yet). I will collect the
  non-null `user_id`s from all three relations rather than relying on
  `NotificationService::getUserRecipients()`'s existing `student_id` branch,
  which calls `whereHas('student_guardian_list.student', ...)` — a relation
  that **does not exist** on the `StudentGuardian` model as it's currently
  written (checked the full model file — no `student()` method). That branch
  looks like latent dead/broken code already in the live notification
  system; not touching it, just not relying on it. Worth flagging to you
  separately, but out of scope for this feature.
- **Frontend notification API already supports what's needed for the red
  dot**: `backend-notifications-api.ts` has `getBackendNotifications({userId,
  filter: 'unread', ...})` returning each notification's `action_url`, and a
  mark-as-read mutation per notification id. No new frontend notification
  endpoint needed — I'll have the backend set a distinctive
  `action_url` (e.g. `discipline-record?student_id=123`) on the notification
  it sends, and have the parent-side card match unread notifications by that
  URL pattern for the specific selected student.
- **`EducatorDashboardMain.tsx` pattern, confirmed by reading it**: dashboard
  entries are plain `DashboardItem[]` objects (`id/title/subtitle/icon/color/
  gradient/onPress`) pushed into `otherItems`, rendered through
  `<EnhancedDashboardGrid>`; each maps to a full-screen modal component
  toggled by `activeModal === id` (see `StudentAchievementModal.tsx`, 1094
  lines, multi-step grade→class→student picker via
  `@react-native-picker/picker` — closest existing template for the new
  create-record form). I'll match this exactly rather than introducing a new
  navigation pattern. Current user's numeric id for the access check is
  `sessionData.data.id` in the `app` redux slice (confirmed in
  `app-slice.ts`).
- **Backend CRUD/approve/reject endpoints for discipline records already
  exist** (built in the earlier pass this session) — `create`, `update`,
  `delete`, `approve`, `reject`, `get-discipline-record-list-data` (already
  supports `status` filter, so "Pending queue" is just
  `status: 'Pending'`), and `get-misconduct-level-list-data` for the level
  picker. None of these have frontend RTK Query wrappers yet except the
  read-only summary endpoint — that's most of the new frontend API work.

## Plan

### Backend — new module: `modules/SectionAccessManagement` (scalable, per the user's ask)

- `Database/Migrations/..._create_section_access_table.php` — new table
  `section_access`: `id, section_key (string, indexed), user_id (FK users),
  granted_by (FK users), created_at, updated_at`, unique on
  `(section_key, user_id)`. `section_key` is a free-text slug
  (`"discipline_management"` for this feature) so any future screen can reuse
  the same table with its own key — this is the "scalable for other
  sections" part.
- `Models/SectionAccess.php`.
- `Intents/GetMySectionAccess/*` — `POST get-my-section-access`, no body
  needed beyond auth; returns the authenticated user's granted
  `section_key`s as a flat array. Every gated screen calls this once (cheap,
  cacheable via RTK Query) and checks `section_keys.includes('discipline_management')`.
- `Intents/GrantSectionAccess/*` / `Intents/RevokeSectionAccess/*` —
  simple create/delete by `{user_id, section_key}`. No role gating in the
  route (matches this codebase's existing convention — see the earlier
  discipline-module plan's finding that no backend module does real
  server-side role checks today); flagged as a decision point below.
- `routes.php`, `config.php`, `Providers/SectionAccessManagementServiceProvider.php`,
  and the same 2 additive one-line registrations in `bootstrap/providers.php`
  / `bootstrap/app.php` as every other module.

### Backend — additive changes to the (still-undeployed, not-live) DisciplineManagement module

- New `Support/DisciplineParentNotifier.php` — resolves a `DisciplineRecord`'s
  student's father/mother/guardian `user_id`s (deduped, nulls dropped) and
  calls `NotificationService::sendModuleNotification()` with:
  `title: "Discipline Record Update"`, a message summarizing the offence and
  marks deducted, `type: 'alert'`, `actionUrl:
  "discipline-record?student_id={id}"`. No-ops quietly (logs, doesn't throw)
  if no parent user accounts are linked yet.
- `ApproveDisciplineRecordAction.php` — call the notifier after the status
  flips to `Approved`.
- `CreateDisciplineRecordAction.php` — call the notifier too, but only on the
  branch where a Level-1 record is auto-approved at creation (status is
  already `Approved`, no separate approve step ever happens for it).
- These two files were written this session and have never been deployed —
  editing them isn't covered by the "don't touch live backend files" rule.

### Frontend — new API files

- `src/api/section-access-api.ts` — `useGetMySectionAccessQuery()` +
  a small `useHasSectionAccess(sectionKey)` convenience hook.
- Extend `src/api/discipline-management-api.ts` — add the missing wrappers:
  `useCreateDisciplineRecordMutation`, `useUpdateDisciplineRecordMutation`,
  `useDeleteDisciplineRecordMutation`, `useApproveDisciplineRecordMutation`,
  `useRejectDisciplineRecordMutation`, `useGetDisciplineRecordListDataQuery`,
  `useGetMisconductLevelListDataQuery`.

### Frontend — `EducatorDashboardMain.tsx`

- Add `useHasSectionAccess('discipline_management')`; when `true`, push a
  `{id: "discipline_management", ...}` entry into `otherItems` (same pattern
  as every existing entry), opening a new full-screen modal via the existing
  `activeModal`/`handleFullScreenPress` mechanism — no new navigation
  pattern introduced.

### Frontend — new `DisciplineManagementModal.tsx`

- Pending queue view (default `status: 'Pending'` filter) + grade/status/
  academic-year filters (reusing `get-discipline-record-list-data`).
- Tap a record → approve / reject / edit / delete (soft) actions.
- "+ Add" → create form: student search + misconduct-level picker
  (auto-fills nature/suggested range from `get-misconduct-level-list-data`)
  + offence/description/incident date/marks-deducted/disciplinary-action/
  parent-informed/student-response fields, matching
  `StudentAchievementModal.tsx`'s multi-step picker conventions
  (`@react-native-picker/picker`) rather than inventing new form UI.

### Frontend — parent-side red dot (`StudentProfileMain.js` + `DisciplineRecordDrawer.tsx`)

- On the Discipline Record nav card: fetch unread notifications for the
  logged-in parent (`useGetBackendNotificationsQuery({userId, filter:
  'unread'})`), filter client-side for
  `action_url?.includes(\`student_id=${selectedStudent.id}\`)`, render a
  small red dot in the card's top-right corner when any match.
- When `DisciplineRecordDrawer` opens for that student, mark the matched
  notification(s) as read via the existing per-notification mark-as-read
  mutation, clearing the dot.

## Decisions (confirmed by user via AskUserQuestion, 2026-09-10)

1. **Granting access**: endpoints only, no admin UI. Access is granted by
   calling `GrantSectionAccess` directly (Postman/DB) for now.
2. **Notification trigger point**: only when a record becomes `Approved`
   (including the Level-1 auto-approve-at-creation path) — never at
   `Pending` creation.
3. Confirmed — building now.
4. Same standing deploy note as every prior backend change this session:
   none of this reaches `school-app.toyar.lk` until it's uploaded via the
   SFTP extension.

## Review

Implemented exactly as planned.

### Backend — new files only, plus 2 pre-existing-this-session (never deployed)
files edited

- **`modules/SectionAccessManagement/`** (new module): migration for
  `section_access` (`section_key`, `user_id`, `granted_by`, unique on the
  first two), `Models/SectionAccess.php`, and three Intents —
  `GetMySectionAccess` (returns the caller's granted `section_keys`),
  `GrantSectionAccess`, `RevokeSectionAccess` (both `updateOrCreate`/`delete`
  by `{user_id, section_key}`, no admin UI per your answer). Routes, config,
  provider, and the same 2 one-line `bootstrap/*` registrations every module
  needs.
- **`modules/DisciplineManagement/Support/DisciplineParentNotifier.php`**
  (new) — resolves a student's father/mother/guardian `user_id`s via the
  `Student::father()/mother()/guardian()` relations (not the
  `NotificationService::getUserRecipients()` `student_id` branch, which
  calls a `StudentGuardian::student()` relation that doesn't exist on that
  model — flagging as a separate pre-existing bug, not touched) and calls
  the already-existing, already-reusable
  `NotificationService::sendModuleNotification()` with `type: 'alert'` and
  `action_url: "discipline-record?student_id={id}"` (the frontend matches
  unread notifications against this URL per-student). No new push-delivery
  code — `SendPushNotificationJob`/`ExpoPushNotificationService` already
  handle that once a `Notification`+`NotificationRecipient` row exists.
- **`ApproveDisciplineRecordAction.php`** — calls the notifier after status
  flips to `Approved`.
- **`CreateDisciplineRecordAction.php`** — calls the notifier only on the
  Level-1 auto-approve-at-creation branch (status is already `Approved`,
  no separate approve step ever happens for it). Per your answer: never
  notified at `Pending` creation.

### Frontend — new files

- **`src/api/section-access-api.ts`** — `useGetMySectionAccessQuery` +
  `useHasSectionAccess(sectionKey)` convenience hook.
- **`src/screens/authenticated/educator/dashboard/modals/DisciplineManagementModal.tsx`**
  (new, ~1000 lines) — pending-first status-filter chips (Pending/Approved/
  Rejected/All) + search, tap-to-approve/reject/edit/delete on each record
  card, "+" opens a create/edit form: student search (reusing
  `useLazyGetStudentListQuery` — the same existing search endpoint used
  elsewhere, not a new one), misconduct-level `Picker` that auto-fills a
  suggested marks value and shows the level's nature/range/examples as
  helper text, `TDateTimePicker` for the incident date (existing shared
  component, not a new date-picker dependency), and the remaining
  offence/description/override-reason/disciplinary-action/parent-informed/
  student-response fields. Matches `StudentAchievementModal.tsx`'s modal
  chrome (`pageSheet` presentation, header/close pattern) rather than
  introducing new navigation UI.

### Frontend — extended existing files

- **`discipline-management-api.ts`** — added `useGetMisconductLevelListDataQuery`,
  `useGetDisciplineRecordListDataQuery`,
  `useCreate/Update/Delete/Approve/RejectDisciplineRecordMutation`, plus the
  `MisconductLevel`/`DisciplineRecordListItem`/pagination types. (Caught by
  `tsc`: `UpdateDisciplineRecordParams` initially `extends
  CreateDisciplineRecordParams`, wrongly requiring `student_id` on update —
  fixed to `Omit<CreateDisciplineRecordParams, "student_id">`, matching the
  backend, which never accepts `student_id` on update.)
- **`api-server-1.ts`** — added `DisciplineRecordList`/`MisconductLevelList`/
  `SectionAccess` tags (additive, same as every prior tag).
- **`EducatorDashboardMain.tsx`** — added `useHasSectionAccess("discipline_management")`;
  when `true`, pushes a `Discipline Management` entry into the existing
  `otherItems` array (same `DashboardItem` shape as every other entry) and
  renders `<DisciplineManagementModal>` via the existing
  `activeModal`/`handleFullScreenPress` mechanism — no new navigation
  pattern, and the item is simply absent from the grid for ungranted users
  (not hidden-but-present).
- **`StudentProfileMain.js`** — added a small unread-notifications query
  (`useGetNotificationsQuery` from the real, already-wired-up
  `notifications.ts` — **not** the parallel `backend-notifications-api.ts`,
  which a repo-wide grep showed has zero callers anywhere and calls a
  `/notifications/{userId}` URL that doesn't match this backend's `/api/...`
  routing convention; treating it as dead/unverified code, not building on
  it). Filters unread notifications by `action_url` containing
  `student_id={id}` and `discipline-record`, renders a small red dot
  (absolute-positioned, top-right) on the Discipline Record card when
  matched.
- **`DisciplineRecordDrawer.tsx`** — added an optional `visible` prop; while
  `true`, matches the same unread notifications for this student and calls
  `useMarkNotificationAsReadMutation` on each, clearing the red dot the
  moment the parent actually opens the drawer (not merely on component
  mount — the drawer's children mount immediately inside the parent's
  `<Modal>` regardless of visibility, so the effect is explicitly gated on
  the new `visible` prop rather than firing on mount).

### Verification

- `php -l` clean on every new/modified backend file.
- `composer dump-autoload` + `php artisan route:list` — both new
  `section-access-management` routes (3) and the still-correct
  `discipline-management` routes (12, unchanged count) register through the
  real booted app with no conflicts, confirming the new
  `SectionAccessManagementServiceProvider` registration and PSR-4 mapping
  resolve, and that editing `Approve`/`CreateDisciplineRecordAction.php`
  didn't break anything.
- `npx eslint` — zero errors across all 7 touched/new frontend files (only
  pre-existing warnings in `EducatorDashboardMain.tsx` that predate this
  session, confirmed by line numbers falling outside anything edited).
- `npx tsc --noEmit` — zero errors in anything touched (grepped explicitly);
  one real bug caught and fixed along the way (see
  `UpdateDisciplineRecordParams` above). Remaining repo-wide `tsc` errors
  are 100% pre-existing, unrelated files (`paymentSlice.ts`,
  `notification-system.test.ts`, `studentGrowthTransform.ts`, etc.).
- `npx expo export --platform web` — production bundle builds successfully
  with everything wired in; verification `dist/` output deleted after.
- **Not verified live** — same standing limitation as every backend change
  this session: needs deploying via the SFTP extension before any of it
  reaches `school-app.toyar.lk`, plus:
  - You'll need to grant yourself (and any other educator) access by
    calling `POST section-access-management/section-access/grant-section-access`
    with `{user_id, section_key: "discipline_management"}` — the dashboard
    item stays invisible until that row exists.
  - No device/simulator here to confirm push notifications actually arrive,
    that the red dot renders/clears correctly in practice, or that the
    `Picker`/`TDateTimePicker`/`Switch` form controls behave as expected on
    a real screen — please test end-to-end: create a Level-1 record (should
    auto-approve + notify immediately), approve a pending Level 2+ record
    (should notify then), and confirm the parent's red dot appears and
    clears on drawer open.

# Plan: WhatsApp-style chat overhaul (src/components/notifications/chat)

## Context

Chat (`ChatListView` → `ChatView` → `GroupInfoScreen`) was a plain conditional
view-swap inside `UniversalNotificationSystem.tsx` — not full-screen, no
on-device media cache (images/video/PDF re-downloaded every open, PDFs
re-converted to base64 each time), no voice notes, and `GroupInfoScreen` had
no media/document gallery. Full plan (with confirmed decisions) was written
via Claude's plan-mode workflow to
`/Users/macbookair/.claude/plans/i-need-more-user-mellow-possum.md` and
approved before implementation; this entry is the required `projectplan.md`
summary per this repo's CLAUDE.md convention.

Decisions confirmed with you: (1) full-screen chat reuses the existing
`react-native-modalize` full-screen pattern already used by dashboard modals,
no new dependency; (2) Chat Info's media galleries get a **new, additive**
backend endpoint (new files + one appended route line) — no existing chat
endpoint touched, "these are running in production"; (3) voice notes are
tap-to-start/tap-to-stop (not press-hold/slide-to-cancel).

## Review

Implemented exactly as planned, in 5 phases.

### Frontend — new files

- **`src/components/notifications/chat/ChatRoomModal.tsx`** — full-screen
  `Modalize` wrapper (`modalHeight={999999}`, `adjustToContentHeight={false}`,
  `modalTopOffset={0}`, absolute-fill `rootStyle` `zIndex: 99999` — same
  config as `AnnouncementsModal.tsx` and the other dashboard modals). Holds
  an internal `"messages" | "info"` view so `ChatView`/`GroupInfoScreen`
  swap inside one modal instance rather than two stacked ones.
- **`src/services/media/ChatMediaCacheService.ts`** — on-device cache for
  chat attachments on `expo-file-system`. Deterministic filename (hash of
  the resolved URL + extension) so "is it cached" is just a file-exists
  check, no manifest. `ensureCached()` dedupes concurrent downloads;
  `adoptLocalFile()` copies a just-sent local file straight into the cache
  (no re-download of your own upload); `evict()` removes a message's cached
  file on delete; a size-capped (500MB) FIFO sweep runs opportunistically.
  Attachments can never be edited (backend only allows editing `type: 'text'`
  messages), so delete is the only invalidation path.
- **`src/state-store/slices/chatCacheSlice.ts`** — persisted (this repo's
  `redux-persist` config is blacklist-based, so any new slice persists by
  default) snapshot of chat threads + each group's last ~30 messages,
  populated via `addMatcher` on the existing `chatApi.getChatThreads` /
  `getChatMessages` fulfilled actions — `chat-api.ts`'s query logic itself
  untouched. `UniversalNotificationSystem`/`ChatView` fall back to this
  snapshot only while the live RTK Query request is still resolving (cold
  start), so the list/messages paint instantly instead of a blank spinner.
- **`src/hooks/useVoiceRecorder.ts`** — tap-to-start/tap-to-stop recording on
  `expo-audio` (`RecordingPresets.HIGH_QUALITY`, `.m4a`).
- **`src/components/notifications/chat/VoiceNoteBubble.tsx`** — separate
  component (not inlined in `MessageBubble`) so `expo-audio`'s
  `useAudioPlayer` is only instantiated for actual voice-note messages, not
  every bubble in the list. Plays from the media cache once resolved.

### Frontend — extended existing files

- **`UniversalNotificationSystem.tsx`** — removed the `currentView: "list" |
  "chat" | "info"` state/render-switch; tapping a real chat (or creating one)
  now calls `chatRoomModalRef.current?.open(chat)` instead. `combinedChats`
  falls back to the persisted `chatCache.threads` snapshot when the live
  query hasn't resolved yet.
- **`ChatView.tsx`** — back icon changed `arrow-back-ios` → `close` (it's now
  a full-screen modal's exit control, not a "back to list" arrow); Android
  hardware back now explicitly closes the modal instead of falling through
  to whatever's mounted underneath. `messages` falls back to the cached
  snapshot for first paint. Wired `ChatMediaCacheService.adoptLocalFile()`
  after a successful attachment send, and `.evict()` in both the
  sender-initiated delete path and the realtime `onMessageDeleted` handler
  (captures the deleted message's `attachment_url` from the RTKQ cache
  before filtering it out). `handleSendAttachment` gained an optional
  `extraMetadata` param (additive — existing callers unaffected) so voice
  notes can carry `duration_ms`.
- **`GroupInfoScreen.tsx`** — added a hardware-back handler (was missing);
  added a Members/Media/Documents tab bar — Media is a 3-column grid of
  images+videos, Documents lists PDFs/voice notes, both backed by the new
  `useGetChatGroupMediaQuery`, opening into the existing `MediaPreviewModal`.
- **`MessageBubble.tsx`** — image thumbnails prefer the cached local file
  once resolved; video/file attachments prewarm the cache in the background
  after render; added an `"audio"` display-type branch (same
  file-reclassification trick already used for video, since the DB `type`
  column has no distinct audio value) rendering `VoiceNoteBubble`.
- **`ChatInputBar.tsx`** — mic button (shown when the text field is empty,
  matching the send-button swap convention) → recording bar with a live
  timer → stop → preview row (discard/send) before actually sending, reusing
  the existing `onSendAttachment("file", ...)` path with `mime_type:
  "audio/m4a"` and `is_voice_note`/`duration_ms` in metadata.
- **`MediaPreviewModal.tsx`** — video now plays from the cache once resolved
  (starts on the remote URL so first-ever playback isn't blocked); PDF
  conversion now reads from the cache when present instead of re-fetching +
  re-converting to base64 every open.
- **`chat-api.ts`** — added `getChatGroupMedia` query (new endpoint
  injection only) + `ChatMediaItem`/`GetChatGroupMediaRequest/Response`
  types.
- **`api-server-1.ts`** — added `"ChatMedia"` tag type (additive, same as
  every prior tag).
- **`store.ts`** — registered `chatCache: chatCacheSlice` in the root
  reducer.
- **`app.json`** — added the `expo-audio` config plugin (it ships its own
  iOS `NSMicrophoneUsageDescription` / Android `RECORD_AUDIO` permission
  wiring) with a school-appropriate permission string. No microphone
  permission existed anywhere before this.

### Backend (toyar-school-app-backend) — additive only, confirmed with you

- **`modules/CommunicationManagement/Intents/Chat/GetChatGroupMedia/`** (new
  folder): `GetChatGroupMediaIntent.php` (auth check, same shape as every
  other chat Intent) + `GetChatGroupMediaAction.php` (verifies group
  membership via the existing `ChatGroup::isMember()`, paginated query over
  `chat_messages` filtered by `category` — image/video/audio/document/all —
  using the same mime-type/extension detection the frontend already used for
  video, since video/audio aren't distinct `type` column values).
- **`modules/CommunicationManagement/routes.php`** — one appended line
  (`Route::post('/media', GetChatGroupMediaIntent::class)`) inside the
  existing `$chatRoutes` closure, alongside the other chat routes. No
  existing route or Action file edited.

### Verification

- `npx tsc --noEmit` — repo-wide error count held at 832 before and after
  every phase (checked incrementally after each phase, not just at the end);
  the only new-looking entries were (a) `ChatRoomModal.tsx`'s Modalize
  `animationIn`/`animationOut` prop error, which is the exact same pre-existing
  type-defs gap present in all 9 other full-screen Modalize dashboard modals
  in this repo, not a regression, and (b) a real one caught and fixed —
  `displayType`'s inferred type didn't include `"audio"`, fixed by typing it
  as `ChatMessage["type"] | "audio"`.
- `php -l` clean on both new backend files and the modified `routes.php`.
- Confirmed via direct reads (not assumption) that `expo-audio`'s
  `useAudioPlayer` dedupes by `JSON.stringify` of the resolved source, not
  object identity — so `VoiceNoteBubble` passing a fresh `{uri, headers}`
  literal every render doesn't cause an audio reload loop.
- **Not verified live** — no device/simulator in this environment. Before
  shipping: rebuild native (the `expo-audio` plugin change needs
  `expo prebuild`/a new dev client or EAS build to take effect — it won't
  apply to an already-built app binary), then test end-to-end: open a chat
  (full screen, close button works, Android back closes it), send/reopen an
  image/video/PDF (should be instant on the second open), delete a media
  message (cached file should be gone from `chat-media-cache/`), cold-start
  the app (list/messages should paint before the network call finishes),
  Chat Info → Media/Documents tabs, and record/send/play a voice note on a
  real device.
