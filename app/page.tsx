import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Coins, Database, Star, UserCheck } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white border-b fixed border-b-slate-200 w-full">
        <Link className="flex items-center justify-center" href="#">
          <Image src="/logo.png" alt="logo" width={50} height={50} />
          <span className="sr-only">Acme Inc</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Features
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="#testimonials">
            Testimonials
          </a>
        </nav>
        <Button className="ml-4" asChild>
          <Link className="text-sm font-medium" href="/login">
            Get Started
          </Link>
        </Button>
      </header>
      <main className="flex-1">
        <section className="w-full py-20 lg:py-32 xl:py-40">
          <div className="container px-4 md:px-6 flex flex-col md:flex-row">
            <div className="flex flex-col space-y-4 md:w-1/2 w-full">
              <div className="space-y-2">
                <h1 className="text-2xl tracking-tighter sm:text-3xl md:text-4xl lg:text-5xl/none">
                  SaaS Template with Supabase, Stripe, Databases
                </h1>
                <p className="text-muted-foreground md:text-xl">
                  Next.js boilerplate with everything you need to launch quickly.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild>
                  <Link href="/signup">Create Account</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/login">View Dashboard</Link>
                </Button>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <Image src="/hero.png" alt="Hero" width={500} height={500} priority />
            </div>
          </div>
        </section>
        <section className="w-full py-10 md:py-20 lg:py-32 bg-muted" id="features">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-4">Our Features</h2>
            <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 border-muted-foreground/10 p-4 rounded-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Payments</h3>
                <p className="text-muted-foreground text-center">
                  Collect one-time payments seamlessly with Stripe Checkout.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-muted-foreground/10 p-4 rounded-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Auth</h3>
                <p className="text-muted-foreground text-center">
                  Supabase authentication with email and social providers out of the box.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border-muted-foreground/10 p-4 rounded-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Database</h3>
                <p className="text-muted-foreground text-center">
                  Ready-to-use Postgres schema powered by Drizzle ORM.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-10 md:py-20 lg:py-32" id="testimonials">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-center mb-4">Trusted by builders</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {["We ship faster with everything pre-wired.", "Billing and auth are solved day one.", "Perfect kickoff for our next MVP."].map((quote, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-2">&ldquo;{quote}&rdquo;</p>
                    <p className="font-semibold">Product Team</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">2024 Acme Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
