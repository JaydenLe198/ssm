"use server"
import { createClient } from '@/utils/supabase/server'
import { redirect } from "next/navigation"
import { revalidatePath } from 'next/cache'
import { upsertUserProfile } from '@/utils/profile/upsertUserProfile'

const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000"

export async function resetPassword(currentState: { message: string }, formData: FormData) {
    const supabase = createClient()
    const passwordData = {
        password: formData.get('password') as string,
        confirm_password: formData.get('confirm_password') as string,
        code: formData.get('code') as string
    }
    if (passwordData.password !== passwordData.confirm_password) {
        return { message: "Passwords do not match" }
    }

    await supabase.auth.exchangeCodeForSession(passwordData.code)

    const { error } = await supabase.auth.updateUser({
        password: passwordData.password
    })
    if (error) {
        return { message: error.message }
    }
    redirect(`/forgot-password/reset/success`)
}

export async function forgotPassword(currentState: { message: string }, formData: FormData) {
    const supabase = createClient()
    const email = formData.get('email') as string
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${PUBLIC_URL}/forgot-password/reset` })

    if (error) {
        return { message: error.message }
    }
    redirect(`/forgot-password/success`)
}

export async function signup(currentState: { message: string }, formData: FormData) {
    const supabase = createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        firstName: (formData.get('firstName') as string)?.trim() ?? '',
        lastName: (formData.get('lastName') as string)?.trim() ?? '',
    }

    if (!data.firstName || !data.lastName) {
        return { message: 'Please provide both your first and last name.' }
    }

    const fullName = `${data.firstName} ${data.lastName}`.trim()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            emailRedirectTo: `${PUBLIC_URL}/auth/callback`,
            data: {
                email_confirm: process.env.NODE_ENV !== 'production',
                full_name: fullName,
            },
        },
    })

    if (signUpError) {
        if (signUpError.message.includes('already registered')) {
            return { message: 'An account with this email already exists. Please login instead.' }
        }
        return { message: signUpError.message }
    }

    if (!signUpData?.user) {
        return { message: 'Failed to create user' }
    }

    const profileResult = await upsertUserProfile({
        supabase,
        userId: signUpData.user.id,
        fullName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: signUpData.user.email,
        roles: ['customer'],
    })

    if (!profileResult.success) {
        console.error('Failed to upsert user profile during signup:', profileResult.error)
        return { message: 'Failed to setup user profile' }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function loginUser(currentState: { message: string }, formData: FormData) {
    const supabase = createClient()

    const credentials = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { data, error } = await supabase.auth.signInWithPassword(credentials)

    if (error) {
        if (error.status === 400 && error.message?.toLowerCase().includes('confirm')) {
            await supabase.auth.resend({
                type: 'signup',
                email: credentials.email,
            })
            return {
                message: 'Please check your inbox. We just re-sent the verification email.',
            }
        }

        return { message: error.message }
    }

    if (!data.user?.email_confirmed_at) {
        await supabase.auth.resend({
            type: 'signup',
            email: credentials.email,
        })
        await supabase.auth.signOut()
        return {
            message: 'Please verify your email before signing in. We just re-sent the verification email.',
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export async function signInWithGoogle() {
    const supabase = createClient()
    const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${PUBLIC_URL}/auth/callback`,
        },
    })

    if (data.url) {
        redirect(data.url)
    }
}

export async function signInWithGithub() {
    const supabase = createClient()
    const { data } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${PUBLIC_URL}/auth/callback`,
        },
    })

    if (data.url) {
        redirect(data.url)
    }
}
