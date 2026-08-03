import NetInfo from "@react-native-community/netinfo";

/**
 * Generates a random token used to (a) authenticate postMessage bridge traffic
 * from the injected WebView page, and (b) as a per-render CSP script nonce.
 *
 * NOTE: this is Math.random()-based, not a true CSPRNG. A real CSPRNG in this
 * RN/Expo environment requires adding a native module (e.g. `expo-crypto`),
 * which was intentionally not added here to avoid an untested native
 * dependency/rebuild as a side effect of a security hardening pass. This is a
 * defense-in-depth token, not the primary security boundary — the primary
 * boundary is the CSP script-src nonce plus the fact that /payment/complete
 * cryptographically re-verifies the CyberSource result server-side regardless
 * of what the WebView bridge claims.
 */
export function generateSecureRandomToken(length: number = 32): string {
  let out = "";
  while (out.length < length) {
    out += Math.random().toString(36).slice(2);
  }
  // Mix in current time to reduce cross-call predictability from Math.random's
  // internal state.
  out += Date.now().toString(36);
  return out.slice(0, length);
}

/**
 * Pre-flight network check before launching the payment WebView.
 * Returns true if connected, false if offline or on a very slow connection.
 */
export async function checkNetworkBeforePayment(): Promise<{
  isConnected: boolean;
  message: string;
}> {
  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.isInternetReachable) {
      return {
        isConnected: false,
        message:
          "No Internet Connection. Please check your data or Wi-Fi settings to complete payment.",
      };
    }
    return { isConnected: true, message: "" };
  } catch {
    return { isConnected: false, message: "Unable to verify network status. Please try again." };
  }
}

/**
 * Builds the secure injected HTML page hosting the CyberSource Unified Checkout SDK.
 *
 * Integration: VAS.UnifiedCheckout() — async Promise-based API
 *  - Session: POST /uc/v1/sessions → capture context JWT
 *  - clientLibrary URL extracted from JWT by backend (ctx[0].data.clientLibrary)
 *  - SDK exposes window.VAS (NOT Flex / UnifiedCheckout / UC)
 *
 * Lifecycle:
 *   VAS.UnifiedCheckout(captureContext) → client
 *   client.createCheckout()             → checkout
 *   checkout.mount(containers)          → result JWT  ← Promise resolves on payment
 *
 * Security:
 *  - CSP allows testup.cybersource.com explicitly
 *  - script-src uses a per-render nonce instead of 'unsafe-inline'/'unsafe-eval' —
 *    only our own nonced script (or a script served from an allowed CyberSource
 *    host) can execute, which meaningfully reduces the impact of any in-page
 *    script-injection vector against the postMessage message-token check.
 *  - 60-second timeout (UC widget + 3DS can take time)
 *  - Message token authentication for postMessage bridge
 */
export function generateSecureCheckoutHtml(
  captureContext: string,
  clientLibraryUrl: string,
  clientLibraryIntegrity: string,
  messageToken: string,
  scriptNonce: string,
): string {
  const safeContext    = JSON.stringify(captureContext);
  const contextLength  = captureContext.length;
  const isJwt          = (captureContext.split('.').length === 3);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />

  <!--
    CSP: testup.cybersource.com listed explicitly — wildcard *.cybersource.com
    may not match it in all Android WebView implementations.

    script-src uses a per-render nonce for our own inline script instead of
    'unsafe-inline'/'unsafe-eval'. The CyberSource SDK itself is loaded from an
    allowed host, not via the nonce. IMPORTANT: removing 'unsafe-eval' has not
    been confirmed against a live CyberSource sandbox session — if the UC widget
    relies on eval()/Function() internally, checkout.mount() may fail. Verify in
    sandbox before shipping; revert to including 'unsafe-eval' if it breaks.

    pay.google.com / *.gstatic.com / accounts.google.com added for Google Pay
    (rendered by the CyberSource widget itself when allowedPaymentTypes includes
    GOOGLEPAY — see InitiatePaymentSessionAction.php). NOT yet confirmed against a
    live session with Google Pay actually rendering — if the WebView console shows
    additional blocked origins during testing, add only those specific hosts here.
  -->
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'self';
             script-src  'self' 'nonce-${scriptNonce}'
                         https://*.cybersource.com https://testup.cybersource.com
                         https://pay.google.com https://*.gstatic.com;
             frame-src   https://*.cybersource.com https://testup.cybersource.com
                         https://*.visa.com https://*.mastercard.com
                         https://pay.google.com https://accounts.google.com;
             connect-src 'self'
                         https://*.cybersource.com https://testup.cybersource.com
                         https://pay.google.com;
             style-src   'self' 'unsafe-inline'
                         https://*.cybersource.com https://testup.cybersource.com
                         https://pay.google.com https://*.gstatic.com;
             img-src     'self' data:
                         https://*.cybersource.com https://testup.cybersource.com
                         https://*.visa.com https://*.mastercard.com
                         https://pay.google.com https://*.gstatic.com;
             font-src    'self'
                         https://*.cybersource.com https://testup.cybersource.com
                         https://*.gstatic.com;" />

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      background: #f5f7fa;
      font-family: -apple-system, 'Segoe UI', sans-serif;
    }
    #status-message {
      text-align: center;
      padding: 48px 20px;
      color: #666;
      font-size: 15px;
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid #e0e0e0;
      border-top-color: #1565C0;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* UC SDK mounts into these two containers */
    #payment-buttons { width: 100%; }
    #payment-form    { width: 100%; }
  </style>
</head>
<body>

<div id="status-message">
  <div class="spinner"></div>
  <p>Loading secure payment form...</p>
</div>

<!-- UC SDK mounts payment selection here -->
<div id="payment-buttons"></div>

<!-- UC SDK mounts card entry form here -->
<div id="payment-form"></div>

<!--
  VAS SDK is loaded dynamically from the inline script below (not as a static
  <script src> tag) so there are no inline event-handler attributes — those
  require 'unsafe-inline' regardless of the nonce, which we've removed from CSP.
-->
<script nonce="${scriptNonce}">
  var mountTimeoutId  = null;
  var isPaymentActive = false;

  function postToNative(payload) {
    try {
      payload._token = '${messageToken}';
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch(e) {}
  }

  // Loads the CyberSource SDK from the session-specific URL in the capture
  // context JWT (ctx[0].data.clientLibrary). Uses createElement + property
  // assignment (not HTML attributes) so load/error listeners are attached
  // before the request starts — no race with the browser firing the event
  // before our handler exists.
  function loadSdk(url, integrity) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      if (integrity) {
        s.integrity   = integrity;
        s.crossOrigin = 'anonymous';
      }
      s.onload = function() {
        postToNative({
          type: 'PHASE2_LOG',
          message: '[UC] SDK onload fired',
          data: {
            libraryUrl: url,
            VAS:             typeof window.VAS,
            Flex:            typeof window.Flex,
            UnifiedCheckout: typeof window.UnifiedCheckout,
            UC:              typeof window.UC
          }
        });
        resolve();
      };
      s.onerror = function() {
        postToNative({
          type: 'MOUNT_PAYMENT_UNAVAILABLE',
          message: 'UC SDK script failed to load from: ' + url
        });
        reject(new Error('UC SDK script failed to load'));
      };
      document.head.appendChild(s);
    });
  }

  // 60-second timeout — UC widget includes 3DS which can be slow
  mountTimeoutId = setTimeout(function() {
    if (!isPaymentActive) {
      postToNative({
        type: 'MOUNT_PAYMENT_UNAVAILABLE',
        message: 'Payment form timed out after 60 seconds.'
      });
    }
  }, 60000);

  // Decode a JWT's payload section without a library
  function decodeJwtPayload(jwt) {
    try {
      var parts = jwt.split('.');
      if (parts.length !== 3) return null;
      var padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (padded.length % 4) padded += '=';
      return JSON.parse(atob(padded));
    } catch(e) {
      return null;
    }
  }

  async function initCheckout() {
    try {
      // ── Task 8: Origin check ───────────────────────────────────────────────
      postToNative({
        type: 'PHASE2_LOG',
        message: '[UC] ORIGIN CHECK',
        data: {
          windowOrigin: window.location.origin,
          windowHref:   window.location.href,
          VAS:          typeof window.VAS,
        }
      });

      // ── Task 5: Decode capture context JWT ────────────────────────────────
      var captureContext = ${safeContext};
      if (typeof captureContext !== 'string' || captureContext.length === 0) {
        throw new Error('captureContext is empty or not a string');
      }
      var sessionJwtPayload = decodeJwtPayload(captureContext);
      postToNative({
        type: 'PHASE2_LOG',
        message: '[UC] CAPTURE CONTEXT JWT DECODED',
        data: {
          captureCtxLen:    ${contextLength},
          captureCtxIsJWT:  ${isJwt},
          // Key fields from the JWT payload:
          ctx:              sessionJwtPayload ? sessionJwtPayload.ctx : null,
          completeMandate:  sessionJwtPayload ? sessionJwtPayload.completeMandate : null,
          targetOrigins:    sessionJwtPayload ? sessionJwtPayload.targetOrigins : null,
          clientLibrary:    sessionJwtPayload ? sessionJwtPayload.clientLibrary : null,
          allowedPaymentTypes: sessionJwtPayload ? sessionJwtPayload.allowedPaymentTypes : null,
        }
      });

      // ── Load the CyberSource SDK (dynamic, no inline attribute handlers) ───
      await loadSdk(${JSON.stringify(clientLibraryUrl)}, ${JSON.stringify(clientLibraryIntegrity || null)});

      if (typeof window.VAS === 'undefined') {
        throw new Error(
          'VAS is undefined after SDK loaded from: ${clientLibraryUrl}. '
          + 'Flex=' + typeof window.Flex
          + ' UnifiedCheckout=' + typeof window.UnifiedCheckout
          + ' UC=' + typeof window.UC
        );
      }

      // ── Task 2 + Step 1: VAS.UnifiedCheckout() ────────────────────────────
      postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 1 - VAS.UnifiedCheckout()' });
      var client = await window.VAS.UnifiedCheckout(captureContext);
      postToNative({
        type: 'PHASE2_LOG',
        message: '[UC] STEP 1 COMPLETE',
        data: { clientType: typeof client, clientKeys: client ? Object.keys(client).join(',') : 'null' }
      });

      // ── Task 2 + 3 + 4: client.createCheckout({ autoProcessing: true }) ───
      postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 2 - client.createCheckout({ autoProcessing: true })' });
      var checkout = await client.createCheckout({ autoProcessing: true });
      // Task 3: log checkout object keys
      postToNative({
        type: 'PHASE2_LOG',
        message: '[UC] STEP 2 COMPLETE — CHECKOUT CREATED',
        data: {
          type: typeof checkout,
          keys: checkout ? Object.keys(checkout).join(',') : 'null',
        }
      });

      // Widget mounting — hide spinner, signal RN
      isPaymentActive = true;
      clearTimeout(mountTimeoutId);
      document.getElementById('status-message').style.display = 'none';
      postToNative({ type: 'SDK_MOUNTED' });

      // ── Task 2 + Step 3: checkout.mount() ─────────────────────────────────
      postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 3 - checkout.mount()' });
      var result = await checkout.mount({
        paymentSelection: '#payment-buttons',
        paymentScreen:    '#payment-form',
      });
      postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 3 COMPLETE - mount() resolved' });

      // ── Task 6: Decode result JWT before sending to backend ───────────────
      var resultStr   = (typeof result === 'string') ? result : JSON.stringify(result);
      var resultIsJwt = (typeof result === 'string' && result.split('.').length === 3);
      var resultPayload = resultIsJwt ? decodeJwtPayload(result) : null;

      postToNative({
        type: 'PHASE2_LOG',
        message: '[UC] RESULT JWT DECODED',
        data: {
          resultType:    typeof result,
          resultIsJWT:   resultIsJwt,
          resultLength:  resultStr.length,
          resultPreview: resultStr.substring(0, 120),
          // Task 6 fields:
          status:         resultPayload ? resultPayload.status : null,
          reason:         resultPayload ? resultPayload.reason : null,
          decision:       resultPayload ? resultPayload.decision : null,
          id:             resultPayload ? resultPayload.id : null,
          transientToken: resultPayload ? resultPayload.transientToken : null,
          // full payload for analysis:
          jwtPayload:     resultPayload,
        }
      });

      // ── Step 5: Send result to React Native (only after logging) ──────────
      postToNative({
        type: 'PAYMENT_SUCCESS',
        transientToken: resultStr,
      });

      // ── Task 2: Cleanup with logs ─────────────────────────────────────────
      postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 4 - checkout.destroy()' });
      try { await checkout.destroy(); postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 4 COMPLETE' }); } catch(e) {}

      postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 5 - client.destroy()' });
      try { await client.destroy();   postToNative({ type: 'PHASE2_LOG', message: '[UC] STEP 5 COMPLETE' }); } catch(e) {}

    } catch (e) {
      // ── Task 1: Full error object serialization ───────────────────────────
      clearTimeout(mountTimeoutId);

      var details = {
        name:    e ? e.name    : null,
        message: e ? e.message : null,
        reason:  e ? e.reason  : null,
        code:    e ? e.code    : null,
        stack:   e ? e.stack   : null,
      };

      try {
        details.full = JSON.stringify(e, Object.getOwnPropertyNames(e));
      } catch (_) {}

      postToNative({
        type: 'MOUNT_PAYMENT_UNAVAILABLE',
        message: 'UC SDK Exception',
        data: details,
      });
    }
  }

  // Wait for DOM ready, then run async init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { initCheckout(); });
  } else {
    initCheckout();
  }
</script>

</body>
</html>
  `.trim();
}

/**
 * Determines whether a navigation URL should be allowed during an active 3DS flow.
 * During 3DS, issuing banks redirect to their own verification pages (Verified by Visa, etc.)
 * We must allow those redirects while still blocking arbitrary unknown URLs.
 */
export function is3DSAllowedUrl(url: string): boolean {
  // Always allow CyberSource domains
  if (url.includes("cybersource.com")) return true;
  // Allow blank/initial load only — file:// is intentionally NOT allowed in a
  // payment WebView (no legitimate 3DS/CyberSource flow needs local file access).
  if (url === "about:blank") return true;
  // Allow 3DS issuing bank redirect domains, plus Google Pay's own domains
  // (rendered by the CyberSource widget — see generateSecureCheckoutHtml CSP
  // comment). Google Pay is expected to stay inside an iframe (frame-src) rather
  // than navigate top-level, but these are allowed defensively in case sign-in
  // or the payment sheet ever triggers a real navigation instead.
  const allowed3DSDomains = [
    "visa.com",
    "mastercard.com",
    "amexglobaltravellercard.com",
    "americanexpress.com",
    "unionpayintl.com",
    // Sri Lankan bank domains that may host 3DS pages
    "hnb.lk",
    "combank.lk",
    "sampath.lk",
    "seylan.lk",
    "boc.lk",
    "peoples.lk",
    "dfcc.lk",
    // Google Pay
    "pay.google.com",
    "accounts.google.com",
  ];
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return allowed3DSDomains.some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}
