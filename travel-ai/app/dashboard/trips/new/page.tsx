"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { ArrowLeft, Plane } from "lucide-react"
import Link from "next/link"

export default function NewTripPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Trip</h1>
          <p className="text-muted-foreground">
            Plan your next adventure with AI assistance
          </p>
        </div>
      </div>

      {/* Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plane className="w-5 h-5 mr-2" />
            Trip Information
          </CardTitle>
          <CardDescription>
            Fill in the basic details to start planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Feature in Development</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              The trip creation form will be available soon. 
              We're working on a revolutionary planning experience!
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
