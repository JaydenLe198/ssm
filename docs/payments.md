## Stripe Payments Checklist

1. Set `STRIPE_SECRET_KEY` in `.env.local` (server only).
2. (Optional) Set `NEXT_PUBLIC_WEBSITE_URL` if you need a custom redirect domain; otherwise `http://localhost:3000` is used in dev.
3. Set `STRIPE_WEBHOOK_SECRET` for the webhook handler.
4. Restart `pnpm dev` after updating environment variables.
5. Run `pnpm exec stripe login` (once) to authenticate the CLI.
6. Start a webhook tunnel: `pnpm stripe:listen`.
7. Copy the printed webhook secret into `STRIPE_WEBHOOK_SECRET`.
8. Keep the `stripe listen` process running while testing payments.
9. Use Stripe test cards (e.g. `4242 4242 4242 4242`) when redirected to Checkout.
10. Stop the listener when finished: `CTRL+C`.

### Local Test Recipe

1. Run `pnpm stripe:listen` in one terminal.
2. In another terminal, `pnpm dev` and open the chat booking form.
3. Submit booking details; the server will respond with a Checkout URL and the browser redirects automatically.
4. Complete Checkout with a test card. On success you return to the chat view; it shows a banner while Stripe authorizes the payment.
5. Accept the booking in the tutor tab to trigger manual capture. Decline to test the cancellation path.
6. Check the listener terminal – Stripe should log `checkout.session.completed`, `payment_intent.amount_capturable_updated`, and eventually `payment_intent.succeeded`/`charge.captured`.
