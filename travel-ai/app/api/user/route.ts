import { type NextRequest, NextResponse } from "next/server"

// Mock user data
const users = [
  { id: "1", name: "John Doe", email: "john@example.com" },
  { id: "2", name: "Jane Smith", email: "jane@example.com" },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (id) {
    const user = users.find((u) => u.id === id)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    return NextResponse.json(user)
  }

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email } = body

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const newUser = {
      id: String(users.length + 1),
      name,
      email,
    }

    users.push(newUser)

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
}
