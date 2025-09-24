import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { upsertUserProfile } from '@/utils/profile/upsertUserProfile'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (user) {
                const { data: existingProfile } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('id', user.id)
                    .maybeSingle()

                const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
                const firstName = (metadata.first_name ?? metadata.firstName ?? null) as string | null
                const lastName = (metadata.last_name ?? metadata.lastName ?? null) as string | null
                const fullNameMetadata = metadata["full_name"] as string | null | undefined
                const fullName = fullNameMetadata ?? [firstName, lastName].filter(Boolean).join(' ')

                const profileResult = await upsertUserProfile({
                    supabase,
                    userId: user.id,
                    fullName,
                    firstName,
                    lastName,
                    email: user.email,
                    roles: existingProfile ? undefined : ['customer'],
                })

                if (!profileResult.success) {
                    console.error('Failed to upsert user profile during OAuth callback:', profileResult.error)
                }
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
