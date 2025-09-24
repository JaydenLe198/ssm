import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function SubscribeSuccess() {
  return (
    <div className="flex flex-col min-h-screen bg-muted">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white border-b border-b-slate-200 w-full">
        <Link className="flex items-center justify-center" href="/">
          <Image src="/logo.png" alt="logo" width={50} height={50} />
          <span className="sr-only">Acme Inc</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md space-y-6 text-center">
          <h1 className="text-3xl font-bold">Thanks for registering!</h1>
          <p className="text-muted-foreground">
            Your account is ready. You can manage payments from your dashboard when you complete a booking.
          </p>
          <Button asChild>
            <Link href="/dashboard">Continue to dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
