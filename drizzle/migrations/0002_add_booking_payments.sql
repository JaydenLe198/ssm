ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS payment_intent_id text,
    ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'requires_payment',
    ADD COLUMN IF NOT EXISTS payment_amount_cents integer,
    ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'usd',
    ADD COLUMN IF NOT EXISTS payment_version integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS last_payment_event_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_payment_error text;

ALTER TABLE public.bookings
    ADD CONSTRAINT IF NOT EXISTS bookings_payment_status_check
    CHECK (payment_status IN ('requires_payment','authorization_pending','authorized','capturable','captured','refunding','refunded','canceled'));

CREATE TABLE IF NOT EXISTS public.booking_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    stripe_event_id text NOT NULL,
    status text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_payments_stripe_event_id_idx
    ON public.booking_payments (stripe_event_id);
