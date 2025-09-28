"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ApiDemo() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleApiCall = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setResult("API call successful! Travel recommendations loaded.")
    } catch (error) {
      setResult("API call failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Demo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Test the travel AI API integration</p>
          <Button onClick={handleApiCall} disabled={loading}>
            {loading ? "Loading..." : "Call Travel API"}
          </Button>
          {result && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm">{result}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
