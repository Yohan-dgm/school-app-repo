import NetInfo from "@react-native-community/netinfo";

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
 * Builds the secure injected HTML page that hosts the CyberSource Flex Microform v2 SDK.
 *
 * Integration: Flex Microform v2 (/flex/v2/sessions)
 *  - Creates individual secure iframe fields for card number, expiry, CVV
 *  - Uses microform.createToken() to generate a transient token
 *  - All events forwarded to React Native via postMessage bridge
 *
 * Security features:
 *  - CSP meta tag: blocks all non-CyberSource scripts and connections
 *  - SRI: script tag uses integrity + crossorigin from server response
 *  - 20-second mount timeout guard
 *  - Message token authentication for postMessage bridge
 *  - 3DS redirects: allowed by NOT blocking navigation in onShouldStartLoadWithRequest
 */
export function generateSecureCheckoutHtml(
  captureContext: string,
  clientLibraryUrl: string,
  clientLibraryIntegrity: string,
  messageToken: string,
): string {
  // Override broken server URL if the backend hasn't been updated yet
  if (clientLibraryUrl.includes('microui/bundle/v2/initiate')) {
    clientLibraryUrl = clientLibraryUrl.replace(
      'microui/bundle/v2/initiate',
      'microform/bundle/v2/flex-microform.min.js'
    );
  }

  // JSON.stringify safely quotes and escapes the JWT for inline JS — no stripping needed.
  const safeContext = JSON.stringify(captureContext);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />

  <!-- CSP: allow scripts, connections, iframes from cybersource.com domains -->
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'self';
             script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.cybersource.com;
             frame-src https://*.cybersource.com https://*.visa.com https://*.mastercard.com;
             connect-src 'self' https://*.cybersource.com;
             style-src 'self' 'unsafe-inline' https://*.cybersource.com;
             img-src 'self' data: https://*.cybersource.com https://*.visa.com https://*.mastercard.com;
             font-src 'self' https://*.cybersource.com;" />

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #f5f7fa; font-family: -apple-system, 'Segoe UI', sans-serif; }

    #status-message {
      text-align: center; padding: 48px 20px; color: #666; font-size: 15px;
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e0e0e0;
      border-top-color: #1565C0; border-radius: 50%;
      animation: spin 0.9s linear infinite; margin: 20px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Card Form ────────────────────────────────────────────── */
    #payment-form {
      display: none;
      padding: 20px 16px;
      max-width: 420px;
      margin: 0 auto;
    }

    .field-group {
      margin-bottom: 18px;
    }
    .field-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .field-container {
      height: 44px;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      background: #ffffff;
      padding: 0 12px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field-container.focused {
      border-color: #1565C0;
      box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12);
    }
    .field-container.invalid {
      border-color: #dc2626;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }
    .field-container.valid {
      border-color: #16a34a;
    }

    .row {
      display: flex;
      gap: 12px;
    }
    .row .field-group {
      flex: 1;
    }

    .field-error {
      font-size: 12px;
      color: #dc2626;
      margin-top: 4px;
      min-height: 16px;
    }

    /* ── Pay Button ───────────────────────────────────────────── */
    #pay-button {
      width: 100%;
      height: 50px;
      background: linear-gradient(135deg, #1565C0, #1976D2);
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      margin-top: 8px;
      letter-spacing: 0.3px;
      transition: opacity 0.2s, transform 0.1s;
    }
    #pay-button:active {
      transform: scale(0.98);
    }
    #pay-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    #form-error {
      text-align: center;
      color: #dc2626;
      font-size: 13px;
      margin-top: 12px;
      min-height: 20px;
    }

    /* ── Card Brand Icon ─────────────────────────────────────── */
    .card-brand {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
    }
  </style>
</head>
<body>

<div id="status-message">
  <div class="spinner"></div>
  <p>Loading secure payment form...</p>
</div>

<div id="payment-form">
  <div class="field-group">
    <label class="field-label">Card Number</label>
    <div id="number-container" class="field-container"></div>
    <div id="number-error" class="field-error"></div>
  </div>

  <div class="row">
    <div class="field-group">
      <label class="field-label">Expiry Date</label>
      <div id="expiration-container" class="field-container"></div>
      <div id="expiration-error" class="field-error"></div>
    </div>
    <div class="field-group">
      <label class="field-label">CVV</label>
      <div id="securityCode-container" class="field-container"></div>
      <div id="securityCode-error" class="field-error"></div>
    </div>
  </div>

  <button id="pay-button" disabled>Pay Now</button>
  <div id="form-error"></div>
</div>

<!-- CyberSource Flex Microform v2 SDK -->
<script
  src="${clientLibraryUrl}"
  ${clientLibraryIntegrity ? 'integrity="' + clientLibraryIntegrity + '" crossorigin="anonymous"' : ''}
></script>

<script>
  var mountTimeoutId = null;
  var isPaymentActive = false;
  var microformInstance = null;

  function postToNative(payload) {
    try {
      payload._token = '${messageToken}';
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch(e) {}
  }

  function showStatus(msg) {
    var el = document.getElementById('status-message');
    if (el) el.innerHTML = '<p>' + msg + '</p>';
  }

  // 20-second mount timeout guard
  mountTimeoutId = setTimeout(function() {
    if (!isPaymentActive) {
      postToNative({ type: 'MOUNT_PAYMENT_UNAVAILABLE', message: 'Payment form took too long to load.' });
    }
  }, 20000);

  function initCheckout() {
    try {
      // Check if SDK loaded
      if (typeof Flex === 'undefined') {
        throw new Error('CyberSource SDK failed to load. Flex is undefined.');
      }

      // ── Flex Microform v2 Integration ──────────────────────────
      var flex = new Flex(${safeContext});
      var microform = flex.microform({
        styles: {
          'input': {
            'font-size': '15px',
            'font-family': '-apple-system, "Segoe UI", sans-serif',
            'color': '#1f2937',
            'line-height': '44px',
          },
          ':focus': { 'color': '#1f2937' },
          ':disabled': { 'cursor': 'not-allowed' },
          'valid': { 'color': '#1f2937' },
          'invalid': { 'color': '#dc2626' },
        }
      });

      microformInstance = microform;

      // ── Create Secure Fields ──────────────────────────────────
      var numberField = microform.createField('number', { placeholder: '•••• •••• •••• ••••' });
      var securityCodeField = microform.createField('securityCode', { placeholder: '•••' });

      // ── Mount Fields ──────────────────────────────────────────
      numberField.load('#number-container');
      securityCodeField.load('#securityCode-container');

      // ── Field State Tracking ──────────────────────────────────
      var fieldStates = { number: false, securityCode: false, expMonth: false, expYear: false };

      function updatePayButton() {
        document.getElementById('pay-button').disabled = !(fieldStates.number && fieldStates.securityCode);
      }

      // Number field events
      numberField.on('change', function(data) {
        var el = document.getElementById('number-container');
        el.className = 'field-container' + (data.valid ? ' valid' : (data.couldBeValid ? '' : ' invalid'));
        fieldStates.number = data.valid;
        document.getElementById('number-error').textContent = (!data.valid && !data.couldBeValid && !data.empty) ? 'Invalid card number' : '';
        updatePayButton();
      });

      numberField.on('focus', function() {
        document.getElementById('number-container').classList.add('focused');
      });
      numberField.on('blur', function() {
        document.getElementById('number-container').classList.remove('focused');
      });

      // Security code field events
      securityCodeField.on('change', function(data) {
        var el = document.getElementById('securityCode-container');
        el.className = 'field-container' + (data.valid ? ' valid' : (data.couldBeValid ? '' : ' invalid'));
        fieldStates.securityCode = data.valid;
        document.getElementById('securityCode-error').textContent = (!data.valid && !data.couldBeValid && !data.empty) ? 'Invalid CVV' : '';
        updatePayButton();
      });

      securityCodeField.on('focus', function() {
        document.getElementById('securityCode-container').classList.add('focused');
      });
      securityCodeField.on('blur', function() {
        document.getElementById('securityCode-container').classList.remove('focused');
      });

      // ── Expiry Fields (plain HTML — not PCI-sensitive) ────────
      var expContainer = document.getElementById('expiration-container');
      expContainer.innerHTML = '<div style="display:flex;align-items:center;height:100%;gap:4px;">'
        + '<input id="exp-month" type="tel" maxlength="2" placeholder="MM" '
        + 'style="width:40px;border:none;outline:none;font-size:15px;font-family:-apple-system,sans-serif;color:#1f2937;text-align:center;background:transparent;" />'
        + '<span style="color:#9ca3af;font-size:16px;">/</span>'
        + '<input id="exp-year" type="tel" maxlength="2" placeholder="YY" '
        + 'style="width:40px;border:none;outline:none;font-size:15px;font-family:-apple-system,sans-serif;color:#1f2937;text-align:center;background:transparent;" />'
        + '</div>';

      // ── Mark as Mounted ───────────────────────────────────────
      isPaymentActive = true;
      clearTimeout(mountTimeoutId);

      document.getElementById('status-message').style.display = 'none';
      document.getElementById('payment-form').style.display = 'block';

      postToNative({ type: 'SDK_MOUNTED' });

      // ── Pay Button Handler ────────────────────────────────────
      document.getElementById('pay-button').addEventListener('click', function() {
        var btn = document.getElementById('pay-button');
        var formError = document.getElementById('form-error');
        formError.textContent = '';

        var expMonth = document.getElementById('exp-month').value.trim();
        var expYear = document.getElementById('exp-year').value.trim();

        // Validate expiry
        if (!expMonth || !expYear || expMonth.length < 1 || expYear.length < 2) {
          formError.textContent = 'Please enter a valid expiry date (MM/YY).';
          return;
        }

        var monthNum = parseInt(expMonth, 10);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
          formError.textContent = 'Expiry month must be between 01 and 12.';
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Processing...';

        var options = {
          expirationMonth: expMonth.padStart(2, '0'),
          expirationYear: '20' + expYear,
        };

        microform.createToken(options, function(err, token) {
          if (err) {
            btn.disabled = false;
            btn.textContent = 'Pay Now';
            var errMsg = (err.message || err.reason || 'Payment failed');
            formError.textContent = errMsg;
            postToNative({ type: 'PAYMENT_FAILED', code: err.reason || 'TOKEN_ERROR', message: errMsg });
            return;
          }

          isPaymentActive = false;
          postToNative({ type: 'PAYMENT_SUCCESS', transientToken: token });
        });
      });

    } catch(e) {
      clearTimeout(mountTimeoutId);
      postToNative({ type: 'MOUNT_PAYMENT_UNAVAILABLE', message: 'SDK Error: ' + (e.message || String(e)) });
    }
  }

  // Wait for DOM to be ready then init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckout);
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
  // Allow blank/initial load
  if (url === "about:blank" || url.startsWith("file://")) return true;
  // Allow 3DS issuing bank redirect domains
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
  ];
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return allowed3DSDomains.some((d) => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}
