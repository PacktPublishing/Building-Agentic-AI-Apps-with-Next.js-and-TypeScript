// API utility functions for client-side requests

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE_URL}/api${endpoint}`

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  get: (endpoint: string) => apiRequest(endpoint),

  post: (endpoint: string, data: any) =>
    apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: (endpoint: string, data: any) =>
    apiRequest(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string) => apiRequest(endpoint, { method: "DELETE" }),
}
