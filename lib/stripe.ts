import Stripe from 'stripe';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2024-06-20';

let stripeClient: Stripe | null = null;

export type StripeEnvError = {
  error: 'stripe_not_configured';
  message: string;
};

export function stripeEnvNotConfigured(): StripeEnvError {
  return {
    error: 'stripe_not_configured',
    message:
      'Stripe is not configured. Set STRIPE_SECRET_KEY (and publishable/webhook secrets) to enable payments.',
  };
}

type StripeClientResult =
  | { ok: true; client: Stripe }
  | { ok: false; error: StripeEnvError };

export function getStripeClient(): StripeClientResult {
  if (stripeClient) {
    return { ok: true, client: stripeClient };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, error: stripeEnvNotConfigured() };
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return { ok: true, client: stripeClient };
}

type CreateManualCaptureIntentArgs = {
  amount: number;
  currency: string;
  customer?: string;
  paymentMethod?: string;
  metadata?: Stripe.MetadataParam;
  idempotencyKey?: string;
};

export async function createManualCapturePaymentIntent({
  amount,
  currency,
  customer,
  paymentMethod,
  metadata,
  idempotencyKey,
}: CreateManualCaptureIntentArgs): Promise<Stripe.PaymentIntent | StripeEnvError> {
  const stripeResult = getStripeClient();
  if (!stripeResult.ok) {
    return stripeResult.error;
  }

  return stripeResult.client.paymentIntents.create(
    {
      amount,
      currency,
      capture_method: 'manual',
      customer,
      payment_method: paymentMethod,
      confirm: Boolean(paymentMethod),
      metadata,
    },
    idempotencyKey
      ? {
          idempotencyKey,
        }
      : undefined
  );
}

type CaptureIntentArgs = {
  paymentIntentId: string;
  idempotencyKey?: string;
};

export async function capturePI({
  paymentIntentId,
  idempotencyKey,
}: CaptureIntentArgs): Promise<Stripe.PaymentIntent | StripeEnvError> {
  const stripeResult = getStripeClient();
  if (!stripeResult.ok) {
    return stripeResult.error;
  }

  return stripeResult.client.paymentIntents.capture(
    paymentIntentId,
    undefined,
    idempotencyKey
      ? {
          idempotencyKey,
        }
      : undefined
  );
}

type CreateCheckoutSessionArgs = {
  amount: number;
  currency: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Stripe.MetadataParam;
  customerEmail?: string;
};

export async function createManualCaptureCheckoutSession({
  amount,
  currency,
  productName,
  successUrl,
  cancelUrl,
  metadata,
  customerEmail,
}: CreateCheckoutSessionArgs): Promise<Stripe.Checkout.Session | StripeEnvError> {
  const stripeResult = getStripeClient();
  if (!stripeResult.ok) {
    return stripeResult.error;
  }

  return stripeResult.client.checkout.sessions.create({
    mode: 'payment',
    payment_intent_data: {
      capture_method: 'manual',
      metadata,
    },
    metadata,
    customer_email: customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: {
            name: productName,
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    expand: ['payment_intent'],
  });
}
