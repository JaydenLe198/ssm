"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormState, useFormStatus } from 'react-dom'
import { signup } from '@/app/auth/actions'

export default function SignupForm() {
    const initialState = {
        message: ''
    }

    const [formState, formAction] = useFormState(signup, initialState)
    const { pending } = useFormStatus()

    return (
        <form action={formAction} className="space-y-3">
            <div className="grid gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    name="firstName"
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    name="lastName"
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    name="email"
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    name="password"
                    required
                />
            </div>
            <Button className="w-full" type="submit" aria-disabled={pending}>
                {pending ? 'Submitting...' : 'Sign up'}
            </Button>
            {formState?.message && (
                <p className="text-sm text-red-500 text-center py-2">{formState.message}</p>
            )}
        </form>
    )
}
