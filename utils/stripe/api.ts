import { Stripe } from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createStripeCustomer(id: string, email: string, name?: string) {
    const customer = await stripe.customers.create({
        name: name ?? '',
        email,
        metadata: {
            supabase_id: id,
        },
    });

    return customer.id;
}
