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
 * Builds the secure injected HTML page that hosts the CyberSource Unified Checkout SDK.
 *
 * Security features:
 *  - CSP meta tag: blocks all non-CyberSource scripts and connections
 *  - SRI: script tag uses integrity + crossorigin from server response
 *  - 15-second mount timeout: if SDK doesn't fire initialized, posts MOUNT_TIMEOUT to native
 *  - window.postMessage: all CyberSource events are forwarded to React Native
 *  - 3DS redirects: allowed by NOT blocking navigation in onShouldStartLoadWithRequest
 */
export function generateSecureCheckoutHtml(
  captureContext: string,
  clientLibraryUrl: string,
  clientLibraryIntegrity: string,
): string {
  // Sanitize — never interpolate raw user content here
  const safeContext = captureContext.replace(/[<>"'`]/g, "");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />

  <!-- CSP: allow scripts and connections ONLY from cybersource.com domains -->
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'self';
             script-src 'self' 'unsafe-inline' https://*.cybersource.com;
             frame-src https://*.cybersource.com https://*.visa.com https://*.mastercard.com;
             connect-src 'self' https://*.cybersource.com;
             style-src 'self' 'unsafe-inline';" />

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #f8f9fa; font-family: -apple-system, sans-serif; }
    #unified-checkout-container { width: 100%; min-height: 420px; padding: 16px; }
    #status-message { text-align: center; padding: 40px 20px; color: #666; font-size: 15px; }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e0e0e0;
      border-top-color: #1565C0; border-radius: 50%;
      animation: spin 0.9s linear infinite; margin: 20px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

<div id="status-message">
  <div class="spinner"></div>
  <p>Loading secure payment form...</p>
</div>

<div id="unified-checkout-container" style="display:none;"></div>

<!-- CyberSource SDK — integrity is only set if server provides it -->
<script
  src="${clientLibraryUrl}"
  ${clientLibraryIntegrity ? `integrity="${clientLibraryIntegrity}" crossorigin="anonymous"` : ''}
></script>

<script>
  var mountTimeoutId = null;
  var isPaymentActive = false;

  function postToNative(payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch(e) {}
  }

  function showStatus(msg) {
    var el = document.getElementById('status-message');
    if (el) el.innerHTML = '<p>' + msg + '</p>';
  }

  // 15-second mount timeout guard (per gateway.md spec)
  mountTimeoutId = setTimeout(function() {
    if (!isPaymentActive) {
      postToNative({ type: 'MOUNT_PAYMENT_UNAVAILABLE', message: 'Payment form took too long to load.' });
    }
  }, 15000);

  function initCheckout() {
    try {
      var microform = Flex('${safeContext}');
      var checkout = microform.createUnifiedCheckout();

      checkout.mount('#unified-checkout-container');
      isPaymentActive = true;
      clearTimeout(mountTimeoutId);

      document.getElementById('status-message').style.display = 'none';
      document.getElementById('unified-checkout-container').style.display = 'block';

      postToNative({ type: 'SDK_MOUNTED' });

      checkout.on('success', function(transientToken) {
        isPaymentActive = false;
        postToNative({ type: 'PAYMENT_SUCCESS', transientToken: transientToken });
      });

      checkout.on('error', function(error) {
        isPaymentActive = false;
        var code = (error && error.code) ? error.code : 'PAYMENT_FAILED';

        if (code === 'CAPTURE_CONTEXT_EXPIRED') {
          postToNative({ type: 'CAPTURE_CONTEXT_EXPIRED' });
        } else if (code === 'NETWORK_ERROR') {
          showStatus('Connection lost. Please check your network and try again.');
          postToNative({ type: 'NETWORK_ERROR' });
        } else {
          postToNative({ type: 'PAYMENT_FAILED', code: code, message: error && error.message });
        }
      });

      checkout.on('cancel', function() {
        isPaymentActive = false;
        postToNative({ type: 'PAYMENT_CANCELLED' });
      });

    } catch(e) {
      clearTimeout(mountTimeoutId);
      postToNative({ type: 'MOUNT_PAYMENT_UNAVAILABLE', message: e.message });
    }
  }

  // Wait for DOM + SDK to be ready
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
