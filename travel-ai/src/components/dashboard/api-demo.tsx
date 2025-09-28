"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export function ApiDemo() {
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testHelloApi = async () => {
    setLoading(true)
    try {
      const data = await api.get("/hello?name=Developer")
      setResponse(data)
    } catch (error) {
      setResponse({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testHealthApi = async () => {
    setLoading(true)
    try {
      const data = await api.get("/health")
      setResponse(data)
    } catch (error) {
      setResponse({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-secondary rounded-lg p-6">
      <h3 className="text-lg font-semibold text-secondary-foreground mb-4">API Demo</h3>

      <div className="space-y-3 mb-4">
        <Button onClick={testHelloApi} disabled={loading} size="sm">
          Test Hello API
        </Button>
        <Button onClick={testHealthApi} disabled={loading} variant="outline" size="sm">
          Test Health API
        </Button>
      </div>

      {response && (
        <div className="bg-muted rounded p-3">
          <pre className="text-xs text-muted-foreground overflow-auto">{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
