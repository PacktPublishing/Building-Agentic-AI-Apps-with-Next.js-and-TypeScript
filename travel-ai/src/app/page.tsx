import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plane, Hotel, MapPin } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plane className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">Travel AI</span>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Sign In</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance leading-tight">
              Plan your perfect trip
              <span className="text-primary block">with AI</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 text-pretty max-w-2xl mx-auto leading-relaxed">
              Flights, hotels, and activities in seconds with intelligent planning.
            </p>
            <Button asChild size="lg" className="text-lg px-8 py-6 h-auto">
              <Link href="/dashboard">Get Started</Link>
            </Button>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-16">
              Everything you need for your journey
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-card border-border/40 p-8 text-center">
                <CardContent className="p-0">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Plane className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Find the best flights</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Compare prices across airlines and find the perfect flight for your schedule and budget.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/40 p-8 text-center">
                <CardContent className="p-0">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Hotel className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Book your ideal hotel</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Discover accommodations that match your preferences and travel style perfectly.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/40 p-8 text-center">
                <CardContent className="p-0">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MapPin className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Discover activities</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Get personalized recommendations for experiences that make your trip unforgettable.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-muted-foreground">© Travel AI App 2025</p>
          <Link href="https://github.com" className="text-muted-foreground hover:text-foreground transition-colors">
            GitHub
          </Link>
        </div>
      </footer>
    </div>
  )
}
