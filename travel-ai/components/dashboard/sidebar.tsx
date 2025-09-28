"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/app/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/dashboard" as const },
  { name: "Trips", href: "/dashboard/trips" as const },
  { name: "Settings", href: "/dashboard/settings" as const },
  { name: "Profile", href: "/dashboard/profile" as const },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <div className="w-64 bg-secondary border-r border-border">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-foreground">
            Travel AI
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <nav className="px-4 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "block px-4 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4 space-y-3">
        {/* Informations utilisateur */}
        {user && (
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-md">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.user_metadata?.name || user.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}
        
        {/* Boutons d'action */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
          
          <Link
            href="/"
            className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
