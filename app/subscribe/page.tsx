import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function Subscribe() {
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
          <h1 className="text-3xl font-bold">No subscription required</h1>
          <p className="text-muted-foreground">
            We now charge per registration and booking, so you can head straight to your dashboard and start building.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
