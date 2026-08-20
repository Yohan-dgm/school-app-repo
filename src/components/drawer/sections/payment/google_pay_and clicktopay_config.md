I already have a working CyberSource Unified Checkout payment integration.

Current stack:

- Backend: Laravel
- Frontend: React Native
- React Native payment UI is hosted inside a WebView
- CyberSource Unified Checkout is used
- HNB IPG is the acquiring/payment gateway setup
- Visa card payments work correctly
- Mastercard card payments work correctly

IMPORTANT:
DO NOT rewrite or break the existing Visa/Mastercard card payment flow.

My next requirement is to properly enable and test:

1. Google Pay through CyberSource Unified Checkout
2. Click to Pay through CyberSource Unified Checkout

I want this implemented according to the CURRENT official CyberSource Unified Checkout documentation, not based on assumptions or old Flex Microform documentation.

FIRST:
Inspect the entire existing payment implementation before changing anything.

Inspect:

- Laravel payment session creation
- CyberSource /uc/v1/sessions request
- Capture Context generation
- targetOrigins
- allowedPaymentTypes
- paymentConfigurations
- completeMandate
- consumerAuthentication
- clientLibrary
- clientLibraryIntegrity
- React Native WebView
- WebView baseUrl/origin
- Unified Checkout JavaScript page
- transient token handling
- payment completion
- authorization
- webhook handling
- payment status handling
- database payment records
- error handling
- logging

Do not make changes until you understand the existing flow.

==================================================
PART 1 — PRESERVE EXISTING CARD PAYMENTS
==================================================

Visa and Mastercard currently work.

Create a baseline before modifying anything.

Verify:

- Visa payment still succeeds
- Mastercard payment still succeeds
- existing capture context works
- existing transient token flow works
- existing authorization works
- existing payment status update works

Do not replace the existing card implementation.

Google Pay and Click to Pay must be ADDITIVE.

==================================================
PART 2 — CYBERSOURCE UNIFIED CHECKOUT CONFIGURATION
==================================================

Verify the CyberSource Business Center configuration for the correct TEST transacting MID.

Do not assume that API configuration alone enables the payment methods.

Verify:

Payment Configuration
→ Unified Checkout

Enable/configure:

- Google Pay
- Click to Pay

For Click to Pay:

- verify Click to Pay is registered/enrolled
- verify business name
- verify website URL
- verify required Click to Pay enrollment/registration configuration
- verify Visa/Mastercard support
- verify any required authentication configuration

For Google Pay:

- verify Google Pay is enrolled/enabled for the transacting MID
- verify business information
- verify Google Pay authentication configuration

Use the official CyberSource documentation as the source of truth.

Do not invent configuration fields.

==================================================
PART 3 — UNIFIED CHECKOUT SESSION
==================================================

The existing integration must continue using:

POST /uc/v1/sessions

Do NOT switch to:

/microform/v2/sessions

Do NOT use Flex Microform v2.

This is Unified Checkout.

The capture-context request must support:

- existing card payment
- GOOGLEPAY
- CLICKTOPAY

Review whether the current request already contains:

allowedPaymentTypes

and configure the payment types using the exact values supported by the current CyberSource UC API.

Expected direction:

allowedPaymentTypes:

- PANENTRY
- GOOGLEPAY
- CLICKTOPAY

Do not blindly add these values without verifying them against the current CyberSource documentation.

==================================================
PART 4 — TARGET ORIGIN
==================================================

The React Native WebView loads the HTTPS checkout page.

Current checkout origin:

https://school-app.toyar.lk

The targetOrigins in the CyberSource capture context must contain the exact HTTPS origin:

https://school-app.toyar.lk

Do NOT use:

- http://
- trailing paths
- localhost
- wildcard origins
- malformed URLs

Verify that the actual WebView origin matches targetOrigins.

Example:

WebView:
https://school-app.toyar.lk/payment/checkout/123

Origin:
https://school-app.toyar.lk

Capture Context:
targetOrigins:
[
"https://school-app.toyar.lk"
]

Do not change this unless the actual checkout domain is different.

==================================================
PART 5 — CLIENT LIBRARY
==================================================

Do NOT hard-code an old CyberSource Flex Microform JavaScript URL.

The Unified Checkout capture context should determine the correct clientLibrary and clientLibraryIntegrity.

Inspect the current capture-context JWT and verify:

- clientLibrary exists
- clientLibraryIntegrity exists
- the client library is compatible with Unified Checkout
- the frontend loads the library returned for the current capture context

Do not use:

flex-microform.min.js

as a substitute for the Unified Checkout library.

The previous implementation had an "invalid capture context" issue, so explicitly verify this.

==================================================
PART 6 — GOOGLE PAY
==================================================

Add Google Pay through Unified Checkout.

Do NOT install a separate native Google Pay SDK unless the official CyberSource UC implementation specifically requires it.

The architecture should remain:

React Native
→ WebView
→ Unified Checkout
→ Google Pay
→ CyberSource

Verify whether paymentConfigurations for GOOGLEPAY are required.

Check the currently supported Google Pay authentication methods.

CyberSource documentation currently supports Google Pay authentication types including:

- PAN_ONLY
- CRYPTOGRAM_3DS

Do not assume which one HNB requires.

Verify the correct configuration from the current CyberSource documentation and merchant configuration.

If both are supported by the merchant configuration, configure appropriately.

==================================================
PART 7 — CLICK TO PAY
==================================================

Add Click to Pay through Unified Checkout.

Do NOT create a completely separate Click to Pay frontend.

The intended architecture is:

React Native
→ WebView
→ Unified Checkout
→ Click to Pay
→ CyberSource

Verify:

- Click to Pay is enabled in Business Center
- merchant website URL is configured
- business name is configured
- Click to Pay registration/enrollment is complete
- Visa Click to Pay is available
- Mastercard Click to Pay is available
- any required authentication setup is complete

Do not assume that "CLICKTOPAY" in allowedPaymentTypes is enough.

Business Center enrollment/registration must also be verified.

==================================================
PART 8 — COMPLETE MANDATE / AUTHENTICATION
==================================================

Inspect the existing completeMandate configuration.

Do not remove existing consumerAuthentication logic.

Determine whether the current implementation should use:

completeMandate:
type: AUTH
consumerAuthentication: true

or the exact current value required by CyberSource.

Verify this against the current CyberSource UC documentation and the HNB merchant configuration.

Pay particular attention to:

- Google Pay
- Click to Pay
- 3-D Secure
- passkey/authentication where applicable

Do not add authentication blindly.

==================================================
PART 9 — FRONTEND
==================================================

The existing React Native WebView must remain.

The WebView should load the existing HTTPS checkout page.

The Unified Checkout page should display:

- Card
- Google Pay
- Click to Pay

depending on device/browser/payment-method eligibility.

Do not force Google Pay to appear on unsupported devices.

Do not assume Google Pay should appear on iOS.

Google Pay availability should be determined by the supported browser/device/environment and CyberSource configuration.

Click to Pay should also appear only when the customer's environment/card is eligible.

==================================================
PART 10 — REACT NATIVE COMMUNICATION
==================================================

Keep the existing:

window.ReactNativeWebView.postMessage()

flow if already implemented.

Do not send sensitive payment data to React Native.

The WebView should only send events such as:

PAYMENT_STARTED
PAYMENT_COMPLETED
PAYMENT_FAILED
PAYMENT_CANCELLED
CHECKOUT_ERROR

Example:

{
"type": "PAYMENT_COMPLETED",
"paymentId": 12345
}

React Native must then ask Laravel for the authoritative payment status.

Do NOT treat a WebView message as proof that the payment succeeded.

==================================================
PART 11 — PAYMENT AUTHORITY
==================================================

The backend/database is the source of truth.

Never:

WebView says SUCCESS
→ React Native says SUCCESS
→ mark order PAID

Instead:

WebView reports completion
→ React Native requests payment status
→ Laravel verifies payment
→ CyberSource result/webhook confirms
→ Laravel marks payment PAID
→ React Native displays success

==================================================
PART 12 — WEBHOOK
==================================================

Inspect the existing CyberSource webhook implementation.

If webhook handling already exists:

- preserve it
- verify it works for Google Pay
- verify it works for Click to Pay

If it does not exist:
implement it according to the current CyberSource documentation.

Webhook processing must be idempotent.

Do not process the same CyberSource event twice.

Store:

- event ID
- payment ID
- gateway transaction ID
- event type
- processing status
- timestamps

==================================================
PART 13 — PAYMENT METHODS IN DATABASE
==================================================

Do not create separate payment systems.

Use the same payment table.

Store the method separately, for example:

CARD
GOOGLE_PAY
CLICK_TO_PAY

The existing Visa/Mastercard card flow remains unchanged.

Do not identify Google Pay or Click to Pay merely from frontend labels.

Use the authoritative gateway/payment response where possible.

==================================================
PART 14 — ERROR HANDLING
==================================================

Add detailed diagnostics for:

1. Capture Context creation failure
2. Invalid targetOrigins
3. Invalid capture context
4. clientLibrary loading failure
5. clientLibraryIntegrity failure
6. Google Pay unavailable
7. Click to Pay unavailable
8. Google Pay initialization failure
9. Click to Pay initialization failure
10. 3DS failure
11. payment authorization failure
12. CyberSource timeout
13. webhook failure

Do not expose:

- API keys
- secret keys
- card numbers
- CVV
- complete payment tokens
- sensitive authentication information

in logs.

==================================================
PART 15 — TEST ENVIRONMENT
==================================================

Use CyberSource TEST/SANDBOX environment.

Do not use production credentials for testing.

Verify:

- Business Center TEST configuration
- TEST transacting MID
- TEST API credentials
- TEST webhook
- TEST capture context
- TEST checkout page

==================================================
PART 16 — GOOGLE PAY TESTING
==================================================

Create a dedicated Google Pay test plan.

Test:

1. Google Pay button appears when eligible
2. Google Pay button does not break normal card checkout
3. Google Pay checkout opens
4. Google Pay authentication works
5. Google Pay payment reaches CyberSource
6. authorization succeeds
7. Laravel receives the correct transaction result
8. webhook is received
9. database becomes PAID
10. React Native displays success
11. failed Google Pay transaction is handled correctly
12. cancelled Google Pay transaction is handled correctly
13. network failure during Google Pay is handled correctly
14. app/WebView closing does not incorrectly mark payment failed

Use ONLY official CyberSource Google Pay test credentials/test procedures.

Do not invent Google Pay test card numbers.

==================================================
PART 17 — CLICK TO PAY TESTING
==================================================

Create a dedicated Click to Pay test plan.

Test:

1. Click to Pay button appears when eligible
2. Click to Pay registration/enrollment works
3. Visa Click to Pay test card works
4. Mastercard Click to Pay test card works
5. stored/enrolled card is recognized
6. authentication works where required
7. payment reaches CyberSource
8. authorization succeeds
9. webhook is received
10. database becomes PAID
11. failed transaction is handled
12. cancelled transaction is handled
13. 3DS/authentication challenge is handled
14. network failure is handled
15. duplicate submission is prevented

Use ONLY official CyberSource Click to Pay test cards/test procedures.

CyberSource currently documents dedicated Visa/Mastercard Click to Pay test cards and separate authentication test cases. Use those exact official test procedures rather than random card numbers.

==================================================
PART 18 — EXISTING VISA/MASTERCARD REGRESSION
==================================================

After implementing Google Pay and Click to Pay, run regression tests:

Test 1:
Visa normal card
Expected:
SUCCESS

Test 2:
Mastercard normal card
Expected:
SUCCESS

Test 3:
Visa declined
Expected:
DECLINED

Test 4:
Mastercard declined
Expected:
DECLINED

Test 5:
Google Pay
Expected:
SUCCESS

Test 6:
Click to Pay Visa
Expected:
SUCCESS

Test 7:
Click to Pay Mastercard
Expected:
SUCCESS

Do not consider the task complete if Google Pay/Click to Pay work but Visa/Mastercard are broken.

==================================================
PART 19 — PAYMENT STATE TESTING
==================================================

Verify these states:

CREATED
SESSION_CREATED
CHECKOUT_STARTED
PROCESSING
AUTHORIZED
PAID
DECLINED
FAILED
CANCELLED
UNKNOWN

Especially test UNKNOWN.

Example:

CyberSource processes the payment successfully
but network connection fails before Laravel receives the response.

The system must NOT automatically mark the payment FAILED.

It must be reconciled through:

- webhook
- transaction status lookup
- reconciliation process

==================================================
PART 20 — DUPLICATE PAYMENT TESTING
==================================================

Test:

Customer taps Pay twice quickly.

Expected:

Only one payment attempt is created/authorized.

Also test:

- app retry
- WebView retry
- API retry
- duplicate webhook

No duplicate charge/order should occur.

==================================================
PART 21 — FINAL ACCEPTANCE CRITERIA
==================================================

Do not tell me "Google Pay is configured" merely because the Google Pay button appears.

The implementation is complete only when:

[ ] Visa works
[ ] Mastercard works
[ ] Google Pay appears when eligible
[ ] Google Pay successful transaction works
[ ] Google Pay failure works
[ ] Google Pay cancellation works
[ ] Click to Pay appears when eligible
[ ] Click to Pay Visa works
[ ] Click to Pay Mastercard works
[ ] Click to Pay authentication works where applicable
[ ] Click to Pay failure works
[ ] Click to Pay cancellation works
[ ] Webhook works
[ ] Payment status is correct in database
[ ] React Native receives final status
[ ] Duplicate payment is prevented
[ ] Unknown/timeout state is handled
[ ] No sensitive payment information is logged
[ ] Existing Visa/Mastercard implementation is unchanged/broken-free

==================================================
IMPORTANT DEVELOPMENT RULE
==================================================

Before making any code changes:

1. Inspect the current implementation.
2. Identify exactly where the UC session is created.
3. Identify the current capture-context payload.
4. Identify how allowedPaymentTypes is configured.
5. Identify how the WebView loads the UC checkout.
6. Identify how the payment completion result reaches Laravel.
7. Identify how payment status is finalized.
8. Identify the current webhook implementation.
9. Identify the current Visa/Mastercard flow.

Then give me:

A. Current architecture
B. What is already correct
C. What is missing for Google Pay
D. What is missing for Click to Pay
E. Exact files that need modification
F. Exact code changes
G. Business Center configuration required
H. Sandbox testing procedure
I. Expected logs/results
J. Regression test results

Do not make unnecessary changes.

Use the current official CyberSource Unified Checkout documentation as the source of truth.
