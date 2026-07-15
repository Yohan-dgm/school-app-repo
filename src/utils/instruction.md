AI Agent Instructions — CyberSource Unified Checkout Debugging (Do NOT Rewrite Architecture)
Current State

The backend migration to Unified Checkout is considered correct.

Verified by logs:

/uc/v1/sessions returns HTTP 201
Content-Type = application/jwt
Capture Context is a valid JWT
UnifiedCheckout.js URL is extracted from the JWT
Frontend now uses VAS.UnifiedCheckout(captureContext)

The current runtime error is:

SDK Error:
An error occurred whilst attempting to complete the transaction.

This means the SDK has initialized successfully and the failure now occurs inside the Unified Checkout payment flow.

CRITICAL RULES

Do NOT:

rewrite the architecture again
switch back to Flex
change session endpoints
change JWT parsing
modify the HMAC signing
invent undocumented SDK APIs
guess CyberSource global variables
move fields around in the payload without documentation

The backend is now considered stable.

The goal is diagnostics only.

Task 1 — Improve SDK Error Logging

Replace the current catch block.

Current:

catch(e){
    postToNative({
        type:"MOUNT_PAYMENT_UNAVAILABLE",
        message:"SDK Error: "+(e.message||String(e))
    });
}

Replace with:

catch (e) {

    clearTimeout(mountTimeoutId);

    const details = {
        name: e?.name,
        message: e?.message,
        reason: e?.reason,
        code: e?.code,
        stack: e?.stack,
    };

    try {
        details.full =
            JSON.stringify(
                e,
                Object.getOwnPropertyNames(e)
            );
    } catch (_) {}

    postToNative({
        type: "MOUNT_PAYMENT_UNAVAILABLE",
        message: "UC SDK Exception",
        data: details
    });
}

We need the FULL SDK error object.

Not only e.message.

Task 2 — Log Every SDK Step

Before every async call add logs.

Example:

postToNative({
    type:"PHASE2_LOG",
    message:"STEP 1 - VAS.UnifiedCheckout()"
});

After success:

postToNative({
    type:"PHASE2_LOG",
    message:"STEP 1 COMPLETE"
});

Do this for:

VAS.UnifiedCheckout()

client.createCheckout()

checkout.mount()

checkout.destroy()

client.destroy()

This tells us exactly where the SDK fails.

Task 3 — Log createCheckout() Result

Immediately after:

const checkout =
    await client.createCheckout();

Log:

postToNative({

    type:"PHASE2_LOG",

    message:"CHECKOUT CREATED",

    data:{

        keys:Object.keys(checkout),

        type:typeof checkout

    }

});
Task 4 — Explicit autoProcessing

Instead of:

client.createCheckout();

temporarily use:

client.createCheckout({

    autoProcessing:true

});

This removes ambiguity.

Task 5 — Decode Session JWT

Immediately after receiving the capture context from Laravel, decode ONLY the payload.

Log:

ctx

completeMandate

targetOrigins

clientLibrary

allowedPaymentTypes

Do NOT modify them.

Log only.

Task 6 — Decode Result JWT

If:

checkout.mount()

returns successfully,

decode the JWT payload.

Log:

status

reason

decision

id

transientToken


Do NOT send to backend until logged.

We first need to know what UC returns.

Task 7 — Keep Backend Unchanged

Do NOT modify:

/uc/v1/sessions

country

locale

data.orderInformation

completeMandate.type

HMAC

JWT parsing

Backend has already been validated.

Task 8 — Verify Origin

Log

window.location.origin

and

window.location.href

Do NOT change targetOrigins.

Log only.

Task 9 — Final Deliverable

Produce a chronological log like:

STEP 1
VAS.UnifiedCheckout()

↓

SUCCESS

STEP 2
createCheckout()

↓

SUCCESS

STEP 3
mount()

↓

FAILED

SDK ERROR

name:

reason:

code:

message:

full object:

stack:

Do not modify code after obtaining these logs.

Wait for analysis.

Important

Do not attempt another migration.

The backend is now returning a valid Unified Checkout session.

The remaining issue is almost certainly one of:

SDK runtime validation
Merchant configuration
Processor configuration
UC session payload requirements