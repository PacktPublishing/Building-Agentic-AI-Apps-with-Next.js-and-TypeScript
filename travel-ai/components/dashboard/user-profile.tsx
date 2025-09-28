"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function UserProfile() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">John Doe</h3>
            <p className="text-sm text-muted-foreground">john.doe@example.com</p>
          </div>
          <div>
            <p className="text-sm">Member since: January 2024</p>
            <p className="text-sm">Total trips: 12</p>
          </div>
          <Button variant="outline" size="sm">
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
