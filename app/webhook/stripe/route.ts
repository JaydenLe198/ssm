export async function POST(req: Request) {
    try {
        const event = await req.json()
        console.warn('Stripe webhook received but subscription handling is disabled.', {
            type: event?.type,
        })
        return new Response('Success', { status: 200 })
    } catch (err) {
        return new Response(`Webhook error: ${err instanceof Error ? err.message : "Unknown error"}`, {
            status: 400,
        })
    }
}
