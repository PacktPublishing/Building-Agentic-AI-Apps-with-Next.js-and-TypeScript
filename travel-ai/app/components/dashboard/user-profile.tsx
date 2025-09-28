"use client"

import { useState, useEffect } from "react"
import { useUserStore } from "@/store/user-store"
import { Button } from "@/components/ui/button"

export function UserProfile() {
  const [, forceUpdate] = useState({})
  const store = useUserStore()

  useEffect(() => {
    const handleStoreUpdate = () => forceUpdate({})

    if (typeof window !== "undefined") {
      window.addEventListener("userStoreUpdate", handleStoreUpdate)
      return () => window.removeEventListener("userStoreUpdate", handleStoreUpdate)
    }
  }, [])

  const handleLogin = () => {
    store.setUser({
      id: "1",
      name: "John Doe",
      email: "john@example.com",
    })
  }

  const handleLogout = () => {
    store.clearUser()
  }

  return (
    <div className="bg-secondary rounded-lg p-6">
      <h3 className="text-lg font-semibold text-secondary-foreground mb-4">User Profile</h3>

      {store.user ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium text-foreground">{store.user.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{store.user.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted-foreground">No user logged in</p>
          <Button onClick={handleLogin} size="sm">
            Demo Login
          </Button>
        </div>
      )}
    </div>
  )
}
