"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Trips", href: "/dashboard/trips" },
  { name: "Settings", href: "/dashboard/settings" },
  { name: "Profile", href: "/dashboard/profile" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-secondary border-r border-border">
      <div className="p-6">
        <Link href="/" className="text-xl font-bold text-foreground">
          Travel AI App
        </Link>
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

      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/"
          className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
