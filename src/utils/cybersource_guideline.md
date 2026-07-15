This is the biggest mistake in your current code

Your code currently does this:

if (window.UC) { ... }
else if (window.UnifiedCheckout) { ... }
else if (window.UnifiedPayments) { ... }
else if (window.Flex) { ... }

The documentation shows none of those are correct.

The official API is:

const client = await VAS.UnifiedCheckout(sessionJWT);

There is no

window.Flex

There is no

window.UnifiedCheckout

There is no

window.UC

There is no

window.Cybersource

Instead the SDK exposes:

VAS

This explains why every global you checked was undefined.

The correct flow

According to CyberSource, it should be:

const client = await VAS.UnifiedCheckout(sessionJWT);

const checkout = await client.createCheckout();

const result = await checkout.mount('#payment-buttons');

NOT

new Flex(...)

NOT

new UnifiedCheckout(...)

NOT

window.UC.configure(...)
This also explains your error

You saw

Flex undefined

Later

UnifiedCheckout undefined

Later

UC undefined

That is because you were checking the wrong globals.

The documentation says

VAS
Another important thing

You currently have

<div id="uc-payment-container"></div>

But the documentation says

checkout.mount('#payment-buttons');

or

checkout.mount({
    paymentSelection:'#payment-buttons',
    paymentScreen:'#payment-form'
});

So the HTML structure must change.

For embedded mode you need something like

<div id="payment-buttons"></div>

<div id="payment-form"></div>
Your success callback is also wrong

You currently expect

onSuccess(...)

or

onSubmit(...)

The documentation says

const result = await checkout.mount(...);

The result is returned from the Promise.

Not from callbacks.

The lifecycle is different

Current code

Load SDK

↓

Guess globals

↓

new Flex()

↓

Callbacks

Correct UC flow

Load SDK

↓

VAS.UnifiedCheckout(sessionJWT)

↓

client

↓

client.createCheckout()

↓

checkout

↓

checkout.mount()

↓

Promise resolves

↓

result JWT

↓

Send to Laravel
One more important detail

This documentation also explains completeMandate.

It says

When completeMandate exists

↓

autoProcessing = true

Therefore

const result = await checkout.mount(...)

returns

completed payment result JWT

instead of a transient token.

That is different from Flex.

This changes your backend slightly

Your backend currently expects

transientTokenJwt

If you keep

completeMandate

then the frontend may return a completed payment result JWT, not a transient token.

You need to verify what your backend's "Complete Payment" endpoint expects based on the Unified Checkout documentation. It may no longer need the same manual authorization step used in the Flex flow.