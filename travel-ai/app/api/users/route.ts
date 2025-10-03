import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET() {
  try {
    const allUsers = await db.select().from(users);
    return Response.json(allUsers);
  } catch (error) {
    console.error("Database error:", error);
    return Response.json({ 
      error: "Database connection failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}